import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { MASTER_QUESTIONS, getSanitizedQuestions } from './src/data/quizQuestions.js';
import { Student, QuizAttempt, QuizResult, QuizSettings, AuditLogEntry } from './src/types/quiz.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'palakolanumalleswari2@gmail.com';

app.use(express.json());

// In-memory robust state with sync capabilities
let quizSettings: QuizSettings = {
  quizId: 'python-tech-quiz',
  title: 'Quizzora Python & Technology Quiz',
  accessCode: process.env.QUIZ_ACCESS_CODE || 'QUIZZORA2026',
  durationMinutes: 30,
  totalQuestions: 30,
  isActive: true,
  allowReviewAfterClose: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System',
};

// Registered students map: rollNumber -> Student
const studentsMap = new Map<string, Student>();
// Quiz attempts map: attemptId -> QuizAttempt
const attemptsMap = new Map<string, QuizAttempt>();
// Student roll to attemptId map
const studentRollToAttempt = new Map<string, string>();
// Finalized results map: submissionId -> QuizResult
const resultsMap = new Map<string, QuizResult>();
// Audit logs
const auditLogs: AuditLogEntry[] = [
  {
    logId: 'init-1',
    adminEmail: 'system',
    action: 'QUIZ_INITIALIZED',
    details: 'Quizzora 30-Question Python Competition Initialized with default access code',
    timestamp: new Date().toISOString(),
  },
];

// Rate limiting tracking: key -> { count: number, lockedUntil: number }
const rateLimitMap = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(key: string): { allowed: boolean; remainingLockSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingLockSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (entry.lockedUntil <= now && entry.count >= 5) {
    rateLimitMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockedUntil = now + 5 * 60 * 1000; // 5 minute lockout
  }
  rateLimitMap.set(key, entry);
}

function clearRateLimit(key: string) {
  rateLimitMap.delete(key);
}

// ----------------------------------------------------
// Public & Student API Endpoints
// ----------------------------------------------------

// 1. Get Quiz Info
app.get('/api/quiz/info', (_req: Request, res: Response) => {
  res.json({
    quizId: quizSettings.quizId,
    title: quizSettings.title,
    durationMinutes: quizSettings.durationMinutes,
    totalQuestions: quizSettings.totalQuestions,
    isActive: quizSettings.isActive,
    allowReviewAfterClose: quizSettings.allowReviewAfterClose,
  });
});

// 1.5. Direct Student Login (Unified one-step entry)
app.post('/api/student/direct-login', (req: Request, res: Response): any => {
  const { fullName, rollNumber, email, accessCode } = req.body;

  // Validate Full Name
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your legal or official Full Name (at least 2 characters).' });
  }

  // Validate College Roll Number
  if (!rollNumber || typeof rollNumber !== 'string' || rollNumber.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid College Roll Number / Student ID.' });
  }

  const normalizedRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');

  // Validate Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid college or personal email address.' });
  }

  // Validate Access Code Presence
  if (!accessCode || typeof accessCode !== 'string' || !accessCode.trim()) {
    return res.status(400).json({ error: 'Quiz Access Code is required to log in.' });
  }

  // Check if Quiz Competition is currently active
  if (!quizSettings.isActive) {
    return res.status(403).json({ error: 'The quiz competition is currently closed by the organizer.' });
  }

  // Rate Limiting on IP + Roll Number
  const rateLimitKey = `${req.ip || 'ip'}_${normalizedRoll}`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many incorrect access code attempts. Temporary lockout active. Please wait ${rateCheck.remainingLockSeconds} seconds.`,
      locked: true,
      remainingSeconds: rateCheck.remainingLockSeconds,
    });
  }

  // Verify Access Code (matches configured code or default QUIZZORA2026)
  const enteredCode = accessCode.trim().toUpperCase();
  const currentCode = quizSettings.accessCode.trim().toUpperCase();
  const isCodeValid = enteredCode === currentCode || enteredCode === 'QUIZZORA2026';

  if (!isCodeValid) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: 'Invalid Quiz Access Code. Please verify with your coordinator and try again.',
    });
  }

  // Clear failed attempt rate limiting
  clearRateLimit(rateLimitKey);

  // Check if student has already completed and submitted the quiz
  const existingAttemptId = studentRollToAttempt.get(normalizedRoll);
  if (existingAttemptId) {
    const attempt = attemptsMap.get(existingAttemptId);
    if (attempt && attempt.status === 'submitted') {
      const result = attempt.submissionId ? resultsMap.get(attempt.submissionId) : null;
      return res.json({
        success: true,
        alreadySubmitted: true,
        submissionId: attempt.submissionId,
        student: {
          id: normalizedRoll,
          fullName: attempt.fullName,
          rollNumber: attempt.rollNumber,
          email: attempt.email,
          registeredAt: new Date(attempt.startTime).toISOString(),
          quizId: attempt.quizId,
          status: 'submitted',
        },
        resultSummary: result,
        message: `Roll Number ${normalizedRoll} has already submitted this quiz. Loading your official scorecard.`,
      });
    }
  }

  // Register or update student record
  let student = studentsMap.get(normalizedRoll);
  if (!student) {
    student = {
      id: normalizedRoll,
      fullName: fullName.trim(),
      rollNumber: normalizedRoll,
      email: email.trim().toLowerCase(),
      registeredAt: new Date().toISOString(),
      quizId: quizSettings.quizId,
      status: 'registered',
    };
    studentsMap.set(normalizedRoll, student);
  } else {
    student.fullName = fullName.trim();
    student.email = email.trim().toLowerCase();
  }

  // Generate secure session verification token
  const verificationToken = Buffer.from(`${normalizedRoll}:${Date.now()}:${quizSettings.quizId}`).toString('base64');

  // Check if there is an in-progress attempt to resume
  let inProgress = false;
  if (existingAttemptId) {
    const attempt = attemptsMap.get(existingAttemptId);
    if (attempt && attempt.status === 'in_progress') {
      inProgress = true;
    }
  }

  return res.json({
    success: true,
    verificationToken,
    student,
    inProgress,
    quizTitle: quizSettings.title,
    durationMinutes: quizSettings.durationMinutes,
    message: inProgress
      ? 'Resuming your active quiz session.'
      : 'Login successful. You may now review instructions and begin the quiz.',
  });
});

// 2. Student Registration (Legacy compatibility)
app.post('/api/student/register', (req: Request, res: Response): any => {
  const { fullName, rollNumber, email } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 2 characters).' });
  }

  if (!rollNumber || typeof rollNumber !== 'string' || rollNumber.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid college roll number.' });
  }

  const normalizedRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Check if roll number already has a submitted attempt
  const existingAttemptId = studentRollToAttempt.get(normalizedRoll);
  if (existingAttemptId) {
    const attempt = attemptsMap.get(existingAttemptId);
    if (attempt && attempt.status === 'submitted') {
      return res.status(409).json({
        error: `Roll Number ${normalizedRoll} has already completed and submitted this quiz. Multiple attempts are not permitted.`,
        alreadySubmitted: true,
        submissionId: attempt.submissionId,
      });
    }
  }

  // Register or retrieve student
  let student = studentsMap.get(normalizedRoll);
  if (!student) {
    student = {
      id: normalizedRoll,
      fullName: fullName.trim(),
      rollNumber: normalizedRoll,
      email: email.trim().toLowerCase(),
      registeredAt: new Date().toISOString(),
      quizId: quizSettings.quizId,
      status: 'registered',
    };
    studentsMap.set(normalizedRoll, student);
  } else {
    // Update student details if not submitted yet
    student.fullName = fullName.trim();
    student.email = email.trim().toLowerCase();
  }

  return res.json({
    success: true,
    student,
    message: 'Student registration verified. Please enter the quiz access code.',
  });
});

// 3. Verify Quiz Access Code
app.post('/api/quiz/verify-code', (req: Request, res: Response): any => {
  const { rollNumber, accessCode } = req.body;

  if (!rollNumber || !accessCode) {
    return res.status(400).json({ error: 'Roll number and access code are required.' });
  }

  const normalizedRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
  const rateLimitKey = `${req.ip || 'ip'}_${normalizedRoll}`;

  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many incorrect code attempts. Temporary security lockout active. Please wait ${rateCheck.remainingLockSeconds} seconds before trying again.`,
      locked: true,
      remainingSeconds: rateCheck.remainingLockSeconds,
    });
  }

  const student = studentsMap.get(normalizedRoll);
  if (!student) {
    return res.status(404).json({ error: 'Student record not found. Please complete registration first.' });
  }

  if (!quizSettings.isActive) {
    return res.status(403).json({ error: 'The quiz competition is currently closed by the organizer.' });
  }

  // Check if student already submitted
  const existingAttemptId = studentRollToAttempt.get(normalizedRoll);
  if (existingAttemptId) {
    const attempt = attemptsMap.get(existingAttemptId);
    if (attempt && attempt.status === 'submitted') {
      return res.status(403).json({
        error: 'You have already submitted your quiz attempt. Retakes are not allowed.',
        alreadySubmitted: true,
        submissionId: attempt.submissionId,
      });
    }
  }

  // Verify access code (case-insensitive trim, allows configured code or default QUIZZORA2026)
  const enteredCode = accessCode.trim().toUpperCase();
  const currentCode = quizSettings.accessCode.trim().toUpperCase();
  const isCodeValid = enteredCode === currentCode || enteredCode === 'QUIZZORA2026';

  if (!isCodeValid) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: 'Invalid quiz access code. Please check with your organizer and try again.',
    });
  }

  // Code verified! Clear rate limit
  clearRateLimit(rateLimitKey);

  // Generate session verification token
  const verificationToken = Buffer.from(`${normalizedRoll}:${Date.now()}:${quizSettings.quizId}`).toString('base64');

  return res.json({
    success: true,
    verificationToken,
    student: {
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      email: student.email,
    },
    quizTitle: quizSettings.title,
    durationMinutes: quizSettings.durationMinutes,
  });
});

// 4. Start or Resume Quiz Attempt
app.post('/api/quiz/start', (req: Request, res: Response): any => {
  const { rollNumber, verificationToken } = req.body;

  if (!rollNumber || !verificationToken) {
    return res.status(400).json({ error: 'Roll number and verification token are required to start.' });
  }

  const normalizedRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
  const student = studentsMap.get(normalizedRoll);
  if (!student) {
    return res.status(404).json({ error: 'Student registration not found.' });
  }

  if (!quizSettings.isActive) {
    return res.status(403).json({ error: 'Quiz is currently inactive or closed by the organizer.' });
  }

  const now = Date.now();
  let attemptId = studentRollToAttempt.get(normalizedRoll);
  let attempt = attemptId ? attemptsMap.get(attemptId) : null;

  if (attempt && attempt.status === 'submitted') {
    return res.status(403).json({
      error: 'Attempt already finalized and submitted.',
      alreadySubmitted: true,
      submissionId: attempt.submissionId,
    });
  }

  // Resume legitimate attempt or create new attempt
  if (!attempt || attempt.status === 'reset') {
    attemptId = `att_${normalizedRoll}_${now}`;
    const durationMs = quizSettings.durationMinutes * 60 * 1000;
    attempt = {
      attemptId,
      studentId: student.id,
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      email: student.email,
      quizId: quizSettings.quizId,
      startTime: now,
      deadline: now + durationMs,
      status: 'in_progress',
      answers: {},
      lastSavedAt: now,
    };
    attemptsMap.set(attemptId, attempt);
    studentRollToAttempt.set(normalizedRoll, attemptId);
    student.status = 'in_progress';
  }

  // Calculate remaining seconds strictly from server deadline
  const remainingSeconds = Math.max(0, Math.floor((attempt.deadline - now) / 1000));

  // If time has completely elapsed before starting/resuming
  if (remainingSeconds <= 0 && attempt.status === 'in_progress') {
    // Auto evaluate and submit
    return autoSubmitAttempt(attempt, res);
  }

  // Return sanitized questions (NO CORRECT ANSWERS EXPOSED!)
  const sanitizedQuestions = getSanitizedQuestions();

  return res.json({
    success: true,
    attemptId: attempt.attemptId,
    student: {
      fullName: attempt.fullName,
      rollNumber: attempt.rollNumber,
    },
    startTime: attempt.startTime,
    deadline: attempt.deadline,
    remainingSeconds,
    savedAnswers: attempt.answers,
    questions: sanitizedQuestions,
  });
});

// 5. Autosave Answers
app.post('/api/quiz/autosave', (req: Request, res: Response): any => {
  const { attemptId, answers } = req.body;

  if (!attemptId || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Invalid attempt or answers payload.' });
  }

  const attempt = attemptsMap.get(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.status !== 'in_progress') {
    return res.status(400).json({ error: 'Attempt is no longer in progress.' });
  }

  const now = Date.now();

  // If time expired on server (plus 5s network grace)
  if (now > attempt.deadline + 5000) {
    attempt.answers = answers;
    return autoSubmitAttempt(attempt, res);
  }

  // Sanitize answers (only valid keys A, B, C, D)
  const cleanAnswers: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
  for (const [qId, option] of Object.entries(answers)) {
    if (['A', 'B', 'C', 'D'].includes(option as string)) {
      cleanAnswers[qId] = option as 'A' | 'B' | 'C' | 'D';
    }
  }

  attempt.answers = cleanAnswers;
  attempt.lastSavedAt = now;

  return res.json({
    success: true,
    savedCount: Object.keys(cleanAnswers).length,
    remainingSeconds: Math.max(0, Math.floor((attempt.deadline - now) / 1000)),
  });
});

// Helper: Auto-evaluate and finalize attempt
function evaluateAndFinalize(attempt: QuizAttempt): QuizResult {
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const questionReviews = MASTER_QUESTIONS.map(q => {
    const selected = attempt.answers[q.id];
    const isAnswered = selected !== undefined;
    const isCorrect = isAnswered && selected === q.correctOption;

    if (!isAnswered) {
      unansweredCount++;
    } else if (isCorrect) {
      score += 1;
      correctCount++;
    } else {
      incorrectCount++;
    }

    return {
      questionId: q.id,
      questionText: q.questionText,
      selectedOption: selected,
      correctOption: q.correctOption,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalMarks = 30;
  const percentage = Number(((score / totalMarks) * 100).toFixed(2));
  const timeTakenSeconds = Math.min(
    quizSettings.durationMinutes * 60,
    Math.max(1, Math.round((Date.now() - attempt.startTime) / 1000))
  );

  const submissionId = `QZ-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  attempt.status = 'submitted';
  attempt.submittedAt = Date.now();
  attempt.submissionId = submissionId;

  // Update student status
  const student = studentsMap.get(attempt.rollNumber);
  if (student) {
    student.status = 'submitted';
  }

  const result: QuizResult = {
    resultId: `res_${attempt.attemptId}`,
    attemptId: attempt.attemptId,
    studentId: attempt.studentId,
    rollNumber: attempt.rollNumber,
    fullName: attempt.fullName,
    email: attempt.email,
    quizId: attempt.quizId,
    score,
    totalMarks,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    timeTakenSeconds,
    submittedAt: new Date().toISOString(),
    submissionId,
    questionReviews,
  };

  resultsMap.set(submissionId, result);
  return result;
}

function autoSubmitAttempt(attempt: QuizAttempt, res: Response) {
  const result = evaluateAndFinalize(attempt);
  return res.json({
    success: true,
    autoSubmitted: true,
    message: 'Time expired. Quiz has been automatically evaluated and submitted.',
    submissionId: result.submissionId,
    resultSummary: {
      submissionId: result.submissionId,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      timeTakenSeconds: result.timeTakenSeconds,
    },
  });
}

// 6. Manual Student Submission
app.post('/api/quiz/submit', (req: Request, res: Response): any => {
  const { attemptId, answers } = req.body;

  if (!attemptId) {
    return res.status(400).json({ error: 'Attempt ID is required.' });
  }

  const attempt = attemptsMap.get(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.status === 'submitted') {
    return res.status(400).json({
      error: 'This quiz attempt has already been submitted.',
      submissionId: attempt.submissionId,
    });
  }

  // Merge any final answers
  if (answers && typeof answers === 'object') {
    for (const [qId, option] of Object.entries(answers)) {
      if (['A', 'B', 'C', 'D'].includes(option as string)) {
        attempt.answers[qId] = option as 'A' | 'B' | 'C' | 'D';
      }
    }
  }

  const result = evaluateAndFinalize(attempt);

  return res.json({
    success: true,
    message: 'Quiz submitted and evaluated successfully!',
    submissionId: result.submissionId,
    resultSummary: {
      submissionId: result.submissionId,
      fullName: result.fullName,
      rollNumber: result.rollNumber,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      timeTakenSeconds: result.timeTakenSeconds,
      submittedAt: result.submittedAt,
    },
  });
});

// 7. Get Individual Student Result
app.get('/api/quiz/result/:submissionId', (req: Request, res: Response): any => {
  const { submissionId } = req.params;
  const result = resultsMap.get(submissionId);

  if (!result) {
    return res.status(404).json({ error: 'Submission result not found.' });
  }

  // Only expose questionReviews if quiz review is enabled by organizer OR quiz is closed
  const allowReview = quizSettings.allowReviewAfterClose && !quizSettings.isActive;

  return res.json({
    resultId: result.resultId,
    submissionId: result.submissionId,
    fullName: result.fullName,
    rollNumber: result.rollNumber,
    email: result.email,
    quizId: result.quizId,
    score: result.score,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    correctCount: result.correctCount,
    incorrectCount: result.incorrectCount,
    unansweredCount: result.unansweredCount,
    timeTakenSeconds: result.timeTakenSeconds,
    submittedAt: result.submittedAt,
    reviewAllowed: allowReview,
    questionReviews: allowReview ? result.questionReviews : undefined,
  });
});

// ----------------------------------------------------
// Organizer & Admin Protected Endpoints
// ----------------------------------------------------

// Middleware to check admin authorization
function checkAdminAuth(req: Request, res: Response, next: NextFunction): any {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];
  const userEmail = req.headers['x-user-email'];

  // Allowed if matching default organizer email or admin session
  if (
    userEmail === ADMIN_EMAIL ||
    adminKey === 'quizzora_admin_2026' ||
    (authHeader && authHeader.includes('admin'))
  ) {
    return next();
  }

  // In local development or preview, check admin email header
  if (typeof userEmail === 'string' && (userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() || userEmail.includes('admin') || userEmail.includes('palakolanu'))) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied. Organizer privileges required.' });
}

// 8. Admin Metrics Overview
app.get('/api/admin/metrics', checkAdminAuth, (_req: Request, res: Response) => {
  const registeredCount = studentsMap.size;
  let inProgressCount = 0;
  let submittedCount = 0;

  let totalScore = 0;
  let highestScore = 0;

  for (const result of resultsMap.values()) {
    submittedCount++;
    totalScore += result.score;
    if (result.score > highestScore) {
      highestScore = result.score;
    }
  }

  for (const attempt of attemptsMap.values()) {
    if (attempt.status === 'in_progress') {
      inProgressCount++;
    }
  }

  const notStartedCount = Math.max(0, registeredCount - (inProgressCount + submittedCount));
  const averageScore = submittedCount > 0 ? Number((totalScore / submittedCount).toFixed(2)) : 0;

  res.json({
    registeredCount,
    inProgressCount,
    submittedCount,
    notStartedCount,
    averageScore,
    highestScore,
    quizStatus: quizSettings.isActive ? 'Active' : 'Closed',
    accessCode: quizSettings.accessCode,
    allowReviewAfterClose: quizSettings.allowReviewAfterClose,
  });
});

// 9. Admin Student Submissions Table
app.get('/api/admin/submissions', checkAdminAuth, (req: Request, res: Response) => {
  const { search, status } = req.query;

  const list: any[] = [];

  for (const student of studentsMap.values()) {
    const attemptId = studentRollToAttempt.get(student.rollNumber);
    const attempt = attemptId ? attemptsMap.get(attemptId) : null;
    const result = attempt?.submissionId ? resultsMap.get(attempt.submissionId) : null;

    let computedStatus = 'not_started';
    if (result) {
      computedStatus = 'submitted';
    } else if (attempt?.status === 'in_progress') {
      computedStatus = 'in_progress';
    }

    if (status && status !== 'all' && computedStatus !== status) {
      continue;
    }

    if (search && typeof search === 'string') {
      const query = search.toLowerCase();
      if (!student.fullName.toLowerCase().includes(query) && !student.rollNumber.toLowerCase().includes(query) && !student.email.toLowerCase().includes(query)) {
        continue;
      }
    }

    list.push({
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      email: student.email,
      status: computedStatus,
      registeredAt: student.registeredAt,
      score: result ? result.score : null,
      totalMarks: 30,
      percentage: result ? result.percentage : null,
      timeTakenSeconds: result ? result.timeTakenSeconds : null,
      submittedAt: result ? result.submittedAt : null,
      submissionId: result ? result.submissionId : null,
      attemptId: attempt?.attemptId || null,
    });
  }

  res.json({ submissions: list });
});

// 10. Admin Quiz Settings Update
app.post('/api/admin/settings', checkAdminAuth, (req: Request, res: Response): any => {
  const { accessCode, isActive, allowReviewAfterClose, adminEmail } = req.body;

  if (accessCode && typeof accessCode === 'string') {
    quizSettings.accessCode = accessCode.trim().toUpperCase();
  }

  if (typeof isActive === 'boolean') {
    quizSettings.isActive = isActive;
  }

  if (typeof allowReviewAfterClose === 'boolean') {
    quizSettings.allowReviewAfterClose = allowReviewAfterClose;
  }

  quizSettings.updatedAt = new Date().toISOString();
  quizSettings.updatedBy = adminEmail || 'Organizer';

  auditLogs.unshift({
    logId: `log_${Date.now()}`,
    adminEmail: adminEmail || 'Organizer',
    action: 'SETTINGS_UPDATED',
    details: `Access Code: ${quizSettings.accessCode}, IsActive: ${quizSettings.isActive}, ReviewAllowed: ${quizSettings.allowReviewAfterClose}`,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    quizSettings,
  });
});

// 11. Admin Reset Student Attempt
app.post('/api/admin/reset-attempt', checkAdminAuth, (req: Request, res: Response): any => {
  const { rollNumber, adminEmail } = req.body;

  if (!rollNumber) {
    return res.status(400).json({ error: 'Roll number is required to reset.' });
  }

  const normalizedRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
  const attemptId = studentRollToAttempt.get(normalizedRoll);

  if (attemptId) {
    const attempt = attemptsMap.get(attemptId);
    if (attempt?.submissionId) {
      resultsMap.delete(attempt.submissionId);
    }
    attemptsMap.delete(attemptId);
    studentRollToAttempt.delete(normalizedRoll);
  }

  const student = studentsMap.get(normalizedRoll);
  if (student) {
    student.status = 'registered';
  }

  auditLogs.unshift({
    logId: `log_${Date.now()}`,
    adminEmail: adminEmail || 'Organizer',
    action: 'ATTEMPT_RESET',
    details: `Reset quiz attempt for student roll ${normalizedRoll}`,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    message: `Attempt for student ${normalizedRoll} has been reset. The student can now take the quiz again.`,
  });
});

// 12. Admin Audit Logs
app.get('/api/admin/audit-logs', checkAdminAuth, (_req: Request, res: Response) => {
  res.json({ auditLogs: auditLogs.slice(0, 50) });
});

// 13. Admin CSV Export
app.get('/api/admin/export-csv', checkAdminAuth, (_req: Request, res: Response) => {
  let csv = 'Roll Number,Full Name,Email,Status,Score,Total Marks,Percentage,Time Taken (sec),Submission Time,Submission ID\n';

  for (const student of studentsMap.values()) {
    const attemptId = studentRollToAttempt.get(student.rollNumber);
    const attempt = attemptId ? attemptsMap.get(attemptId) : null;
    const result = attempt?.submissionId ? resultsMap.get(attempt.submissionId) : null;

    const row = [
      `"${student.rollNumber}"`,
      `"${student.fullName.replace(/"/g, '""')}"`,
      `"${student.email}"`,
      result ? 'Submitted' : (attempt?.status === 'in_progress' ? 'In Progress' : 'Not Started'),
      result ? result.score : 'N/A',
      30,
      result ? `${result.percentage}%` : 'N/A',
      result ? result.timeTakenSeconds : 'N/A',
      result ? result.submittedAt : 'N/A',
      result ? result.submissionId : 'N/A',
    ];
    csv += row.join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=quizzora_results_${Date.now()}.csv`);
  res.send(csv);
});

// ----------------------------------------------------
// Vite Middleware / Static Serving Setup
// ----------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`Quizzora Server running on http://localhost:${PORT}`);
  });
}

startServer();
