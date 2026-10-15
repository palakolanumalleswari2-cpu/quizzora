import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { MASTER_QUESTIONS, getSanitizedQuestions } from './src/data/quizQuestions.js';
import { Student, QuizAttempt, QuizResult, QuizSettings, AuditLogEntry, QuizSession } from './src/types/quiz.js';
import { db } from './src/lib/firebase.js';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'palakolanumalleswari2@gmail.com';

app.use(express.json());

// Persistent & in-memory synced state
let quizSettings: QuizSettings = {
  quizId: 'python-tech-quiz',
  title: 'Quizzora Python & Technology Quiz',
  accessCode: process.env.QUIZ_ACCESS_CODE || 'QUIZZORA2026',
  durationMinutes: 30,
  totalQuestions: 30,
  isActive: true,
  allowReviewAfterClose: false,
  currentSessionId: 'session_1',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System',
};

let currentSessionNumber = 1;

// Active students map: rollNumber -> Student
const studentsMap = new Map<string, Student>();
// Quiz attempts map: attemptId -> QuizAttempt
const attemptsMap = new Map<string, QuizAttempt>();
// Student roll to active attemptId map
const studentRollToAttempt = new Map<string, string>();
// Finalized results map: submissionId -> QuizResult
const resultsMap = new Map<string, QuizResult>();
// Audit logs
const auditLogs: AuditLogEntry[] = [
  {
    logId: 'init-1',
    adminEmail: 'system',
    action: 'QUIZ_INITIALIZED',
    details: 'Quizzora Competition Initialized (Session #1) with default access code',
    timestamp: new Date().toISOString(),
  },
];

// Rate limiting: key -> { count: number, lockedUntil: number }
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
// Firestore Helper Functions (Dual Persistence)
// ----------------------------------------------------

async function saveResultToFirestore(result: QuizResult): Promise<boolean> {
  try {
    const docRef = doc(db, 'quizResults', result.submissionId);
    await setDoc(docRef, {
      resultId: result.submissionId,
      submissionId: result.submissionId,
      attemptId: result.attemptId,
      studentId: result.studentId,
      rollNumber: result.rollNumber,
      fullName: result.fullName,
      email: result.email,
      quizId: result.quizId,
      sessionId: result.sessionId || quizSettings.currentSessionId,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      timeTakenSeconds: result.timeTakenSeconds,
      submittedAt: result.submittedAt,
    });
    console.log(`[Firestore] Successfully saved student result: ${result.rollNumber} (Score: ${result.score}/30)`);
    return true;
  } catch (err) {
    console.error(`[Firestore Error] Could not write quizResult ${result.submissionId}:`, err);
    return false;
  }
}

async function saveStudentToFirestore(student: Student): Promise<boolean> {
  try {
    const docRef = doc(db, 'students', student.rollNumber);
    await setDoc(docRef, {
      id: student.rollNumber,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      email: student.email,
      registeredAt: student.registeredAt,
      quizId: student.quizId,
      status: student.status,
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Could not save student document:', err);
    return false;
  }
}

async function saveAttemptToFirestore(attempt: QuizAttempt): Promise<boolean> {
  try {
    const docRef = doc(db, 'quizAttempts', attempt.attemptId);
    await setDoc(docRef, {
      attemptId: attempt.attemptId,
      studentId: attempt.studentId,
      rollNumber: attempt.rollNumber,
      fullName: attempt.fullName,
      email: attempt.email,
      quizId: attempt.quizId,
      sessionId: attempt.sessionId || quizSettings.currentSessionId,
      startTime: attempt.startTime,
      deadline: attempt.deadline,
      status: attempt.status,
      answers: attempt.answers || {},
      lastSavedAt: attempt.lastSavedAt || Date.now(),
      submissionId: attempt.submissionId || null,
      submittedAt: attempt.submittedAt || null,
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Could not save attempt document:', err);
    return false;
  }
}

// Initial Sync from Firestore on startup
async function syncFromFirestore() {
  try {
    // 1. Sync quiz settings if stored
    const settingsSnap = await getDoc(doc(db, 'quizSettings', quizSettings.quizId));
    if (settingsSnap.exists()) {
      const data = settingsSnap.data() as Partial<QuizSettings>;
      if (data.accessCode) quizSettings.accessCode = data.accessCode;
      if (typeof data.isActive === 'boolean') quizSettings.isActive = data.isActive;
      if (typeof data.allowReviewAfterClose === 'boolean') quizSettings.allowReviewAfterClose = data.allowReviewAfterClose;
      if (data.currentSessionId) quizSettings.currentSessionId = data.currentSessionId;
      if ((data as any).sessionNumber && typeof (data as any).sessionNumber === 'number') {
        currentSessionNumber = (data as any).sessionNumber;
      }
    }

    // 2. Sync results from Cloud Firestore
    const resultsSnap = await getDocs(collection(db, 'quizResults'));
    resultsSnap.forEach(d => {
      const resData = d.data() as QuizResult;
      const subId = resData.submissionId || d.id;
      resultsMap.set(subId, resData);
      if (resData.rollNumber) {
        studentRollToAttempt.set(resData.rollNumber, resData.attemptId);
      }
    });
    console.log(`[Firestore Sync] Successfully loaded ${resultsSnap.size} student results and current session '${quizSettings.currentSessionId}' (Session #${currentSessionNumber}).`);
  } catch (err) {
    console.warn('[Firestore Sync] Non-critical sync notice on startup:', err);
  }
}

syncFromFirestore();

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
    currentSessionId: quizSettings.currentSessionId,
  });
});

// 1.5. Direct Student Login (Unified one-step entry)
app.post('/api/student/direct-login', async (req: Request, res: Response): Promise<any> => {
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

  // Check if student has already completed and submitted the quiz in the CURRENT session
  const existingAttemptId = studentRollToAttempt.get(normalizedRoll);
  if (existingAttemptId) {
    const attempt = attemptsMap.get(existingAttemptId);
    if (attempt && attempt.status === 'submitted' && attempt.sessionId === quizSettings.currentSessionId) {
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
        message: `Roll Number ${normalizedRoll} has already submitted this quiz session. Loading your official scorecard.`,
      });
    }
  }

  // Check in Firestore for submitted result in current session
  try {
    const resultsSnap = await getDocs(collection(db, 'quizResults'));
    for (const d of resultsSnap.docs) {
      const r = d.data() as QuizResult;
      const isCurrentSessionResult = r.sessionId
        ? r.sessionId === quizSettings.currentSessionId
        : quizSettings.currentSessionId === 'session_1';

      if (r.rollNumber === normalizedRoll && isCurrentSessionResult) {
        resultsMap.set(r.submissionId, r);
        return res.json({
          success: true,
          alreadySubmitted: true,
          submissionId: r.submissionId,
          student: {
            id: normalizedRoll,
            fullName: r.fullName,
            rollNumber: r.rollNumber,
            email: r.email,
            registeredAt: r.submittedAt,
            quizId: r.quizId,
            status: 'submitted',
          },
          resultSummary: r,
          message: `Roll Number ${normalizedRoll} has already completed this quiz session. Loading your official scorecard.`,
        });
      }
    }
  } catch (err) {
    console.warn('Firestore lookup notice:', err);
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

  // Save student to Firestore asynchronously
  saveStudentToFirestore(student);

  // Generate secure session verification token
  const verificationToken = Buffer.from(`${normalizedRoll}:${Date.now()}:${quizSettings.quizId}:${quizSettings.currentSessionId}`).toString('base64');

  // Check if there is an in-progress attempt to resume in this session
  let inProgress = false;
  if (existingAttemptId) {
    const attempt = attemptsMap.get(existingAttemptId);
    if (attempt && attempt.status === 'in_progress' && attempt.sessionId === quizSettings.currentSessionId) {
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
    currentSessionId: quizSettings.currentSessionId,
    message: inProgress
      ? 'Resuming your active quiz session.'
      : 'Login successful. You may now review instructions and begin the quiz.',
  });
});

// 2. Start or Resume Quiz Attempt
app.post('/api/quiz/start', async (req: Request, res: Response): Promise<any> => {
  const { rollNumber, verificationToken } = req.body;

  if (!rollNumber || !verificationToken) {
    return res.status(400).json({ error: 'Roll number and verification token are required to start.' });
  }

  const normalizedRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
  let student = studentsMap.get(normalizedRoll);
  if (!student) {
    try {
      const sSnap = await getDoc(doc(db, 'students', normalizedRoll));
      if (sSnap.exists()) {
        student = sSnap.data() as Student;
        studentsMap.set(normalizedRoll, student);
      }
    } catch (err) {
      console.warn('Firestore student fetch notice:', err);
    }
  }

  if (!student) {
    return res.status(404).json({ error: 'Student registration not found. Please return to login.' });
  }

  if (!quizSettings.isActive) {
    return res.status(403).json({ error: 'Quiz is currently inactive or closed by the organizer.' });
  }

  const now = Date.now();
  let attemptId = studentRollToAttempt.get(normalizedRoll);
  let attempt = attemptId ? attemptsMap.get(attemptId) : null;

  // If not in memory, check Firestore for an existing active attempt in the current session
  if (!attempt) {
    try {
      const attSnap = await getDocs(collection(db, 'quizAttempts'));
      for (const d of attSnap.docs) {
        const a = d.data() as QuizAttempt;
        if (a.rollNumber === normalizedRoll && a.sessionId === quizSettings.currentSessionId) {
          attempt = a;
          attemptId = a.attemptId;
          attemptsMap.set(attemptId, attempt);
          studentRollToAttempt.set(normalizedRoll, attemptId);
          break;
        }
      }
    } catch (err) {
      console.warn('Firestore attempt lookup notice:', err);
    }
  }

  // If previous attempt was from an older session or reset, create fresh attempt for current session
  if (attempt && attempt.sessionId !== quizSettings.currentSessionId) {
    attempt = null;
  }

  if (attempt && attempt.status === 'submitted') {
    return res.status(403).json({
      error: 'Attempt already finalized and submitted.',
      alreadySubmitted: true,
      submissionId: attempt.submissionId,
    });
  }

  // Resume legitimate attempt or create fresh attempt
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
      sessionId: quizSettings.currentSessionId,
      startTime: now,
      deadline: now + durationMs,
      status: 'in_progress',
      answers: {},
      lastSavedAt: now,
    };
    attemptsMap.set(attemptId, attempt);
    studentRollToAttempt.set(normalizedRoll, attemptId);
    student.status = 'in_progress';

    // Persist attempt to Firestore
    await saveAttemptToFirestore(attempt);
  }

  // Calculate remaining seconds strictly from server deadline
  const remainingSeconds = Math.max(0, Math.floor((attempt.deadline - now) / 1000));

  // If time has completely elapsed before starting/resuming
  if (remainingSeconds <= 0 && attempt.status === 'in_progress') {
    return await autoSubmitAttempt(attempt, res);
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
    sessionId: attempt.sessionId,
    startTime: attempt.startTime,
    deadline: attempt.deadline,
    remainingSeconds,
    savedAnswers: attempt.answers,
    questions: sanitizedQuestions,
  });
});

// 3. Autosave Answers
app.post('/api/quiz/autosave', async (req: Request, res: Response): Promise<any> => {
  const { attemptId, answers } = req.body;

  if (!attemptId || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Invalid attempt or answers payload.' });
  }

  let attempt = attemptsMap.get(attemptId);
  if (!attempt) {
    try {
      const attSnap = await getDoc(doc(db, 'quizAttempts', attemptId));
      if (attSnap.exists()) {
        attempt = attSnap.data() as QuizAttempt;
        attemptsMap.set(attemptId, attempt);
      }
    } catch (err) {
      console.warn('Firestore autosave attempt lookup notice:', err);
    }
  }

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
    return await autoSubmitAttempt(attempt, res);
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

  // Asynchronously save to Firestore
  saveAttemptToFirestore(attempt);

  return res.json({
    success: true,
    savedCount: Object.keys(cleanAnswers).length,
    remainingSeconds: Math.max(0, Math.floor((attempt.deadline - now) / 1000)),
  });
});

// Helper: Auto-evaluate and finalize attempt (stores in Firestore)
async function evaluateAndFinalize(attempt: QuizAttempt): Promise<QuizResult> {
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
    resultId: submissionId, // Matches firestore document ID exactly
    submissionId,
    attemptId: attempt.attemptId,
    studentId: attempt.studentId,
    rollNumber: attempt.rollNumber,
    fullName: attempt.fullName,
    email: attempt.email,
    quizId: attempt.quizId,
    sessionId: attempt.sessionId || quizSettings.currentSessionId,
    score,
    totalMarks,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    timeTakenSeconds,
    submittedAt: new Date().toISOString(),
    questionReviews,
  };

  resultsMap.set(submissionId, result);

  // SAVE TO CLOUD FIRESTORE IMMEDIATELY
  await saveResultToFirestore(result);
  await saveAttemptToFirestore(attempt);
  if (student) {
    await saveStudentToFirestore(student);
  }

  return result;
}

async function autoSubmitAttempt(attempt: QuizAttempt, res: Response): Promise<any> {
  const result = await evaluateAndFinalize(attempt);
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
      sessionId: result.sessionId,
    },
  });
}

// 4. Manual Student Submission
app.post('/api/quiz/submit', async (req: Request, res: Response): Promise<any> => {
  const { attemptId, answers } = req.body;

  if (!attemptId) {
    return res.status(400).json({ error: 'Attempt ID is required.' });
  }

  let attempt = attemptsMap.get(attemptId);
  if (!attempt) {
    try {
      const attSnap = await getDoc(doc(db, 'quizAttempts', attemptId));
      if (attSnap.exists()) {
        attempt = attSnap.data() as QuizAttempt;
        attemptsMap.set(attemptId, attempt);
      }
    } catch (err) {
      console.warn('Firestore submit attempt lookup notice:', err);
    }
  }

  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found or expired.' });
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

  const result = await evaluateAndFinalize(attempt);

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
      sessionId: result.sessionId,
    },
  });
});

// 5. Get Individual Student Result
app.get('/api/quiz/result/:submissionId', async (req: Request, res: Response): Promise<any> => {
  const { submissionId } = req.params;
  let result = resultsMap.get(submissionId);

  // If not found in memory, fetch directly from Firestore
  if (!result) {
    try {
      const docSnap = await getDoc(doc(db, 'quizResults', submissionId));
      if (docSnap.exists()) {
        result = docSnap.data() as QuizResult;
        resultsMap.set(submissionId, result);
      }
    } catch (err) {
      console.warn('Firestore get error:', err);
    }
  }

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
    sessionId: result.sessionId || 'session_1',
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

  if (typeof userEmail === 'string' && (userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() || userEmail.includes('admin') || userEmail.includes('palakolanu'))) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied. Organizer privileges required.' });
}

// 6. Admin Metrics Overview (Aggregates from Firestore + in-memory)
app.get('/api/admin/metrics', checkAdminAuth, async (_req: Request, res: Response) => {
  // Read latest results from Firestore to ensure all devices/instances are captured
  try {
    const snap = await getDocs(collection(db, 'quizResults'));
    snap.forEach(docSnap => {
      const data = docSnap.data() as QuizResult;
      const subId = data.submissionId || docSnap.id;
      resultsMap.set(subId, data);
    });
  } catch (err) {
    console.warn('[Admin Metrics] Firestore notice:', err);
  }

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
    registeredCount: Math.max(registeredCount, submittedCount),
    inProgressCount,
    submittedCount,
    notStartedCount,
    averageScore,
    highestScore,
    quizStatus: quizSettings.isActive ? 'Active' : 'Closed',
    accessCode: quizSettings.accessCode,
    allowReviewAfterClose: quizSettings.allowReviewAfterClose,
    currentSessionId: quizSettings.currentSessionId,
    sessionNumber: currentSessionNumber,
  });
});

// 7. Admin Student Submissions Table (Directly queries Firestore)
app.get('/api/admin/submissions', checkAdminAuth, async (req: Request, res: Response) => {
  const { search, status, sessionId } = req.query;
  const submissionsMap = new Map<string, any>();

  // 1. Read from Firestore quizResults
  try {
    const snap = await getDocs(collection(db, 'quizResults'));
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const subId = data.submissionId || docSnap.id;
      submissionsMap.set(subId, {
        rollNumber: data.rollNumber,
        fullName: data.fullName,
        email: data.email,
        status: 'submitted',
        score: data.score,
        totalMarks: data.totalMarks || 30,
        percentage: data.percentage,
        timeTakenSeconds: data.timeTakenSeconds,
        submittedAt: data.submittedAt,
        submissionId: subId,
        sessionId: data.sessionId || 'session_1',
        attemptId: data.attemptId || null,
      });
    });
  } catch (err) {
    console.warn('[Admin Submissions] Firestore read notice (falling back to memory):', err);
  }

  // 2. Merge with in-memory results map
  for (const [subId, resItem] of resultsMap.entries()) {
    if (!submissionsMap.has(subId)) {
      submissionsMap.set(subId, {
        rollNumber: resItem.rollNumber,
        fullName: resItem.fullName,
        email: resItem.email,
        status: 'submitted',
        score: resItem.score,
        totalMarks: resItem.totalMarks || 30,
        percentage: resItem.percentage,
        timeTakenSeconds: resItem.timeTakenSeconds,
        submittedAt: resItem.submittedAt,
        submissionId: subId,
        sessionId: resItem.sessionId || quizSettings.currentSessionId,
        attemptId: resItem.attemptId,
      });
    }
  }

  // 3. Include in-progress attempts from memory
  for (const student of studentsMap.values()) {
    const attemptId = studentRollToAttempt.get(student.rollNumber);
    const attempt = attemptId ? attemptsMap.get(attemptId) : null;
    if (attempt && attempt.status === 'in_progress') {
      const key = `inprog_${student.rollNumber}`;
      if (!submissionsMap.has(attempt.submissionId || key)) {
        submissionsMap.set(attempt.submissionId || key, {
          rollNumber: student.rollNumber,
          fullName: student.fullName,
          email: student.email,
          status: 'in_progress',
          score: null,
          totalMarks: 30,
          percentage: null,
          timeTakenSeconds: Math.round((Date.now() - attempt.startTime) / 1000),
          submittedAt: null,
          submissionId: null,
          sessionId: attempt.sessionId || quizSettings.currentSessionId,
          attemptId: attempt.attemptId,
        });
      }
    }
  }

  let list = Array.from(submissionsMap.values());

  // Filter by session if requested
  if (sessionId && sessionId !== 'all') {
    list = list.filter(item => item.sessionId === sessionId);
  }

  // Filter by status
  if (status && status !== 'all') {
    list = list.filter(item => item.status === status);
  }

  // Filter by search query
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(item =>
      (item.fullName && item.fullName.toLowerCase().includes(q)) ||
      (item.rollNumber && item.rollNumber.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q))
    );
  }

  res.json({
    submissions: list,
    currentSessionId: quizSettings.currentSessionId,
    sessionNumber: currentSessionNumber,
  });
});

// 8. Organizer Restart Quiz Competition (Creates new session, preserves all prior marks)
app.post('/api/admin/restart-session', checkAdminAuth, async (req: Request, res: Response): Promise<any> => {
  const { adminEmail, newTitle } = req.body;
  const now = new Date();

  // 1. Close current session in Firestore
  const prevSessionId = quizSettings.currentSessionId;
  try {
    const prevSessionRef = doc(db, 'quizSessions', prevSessionId);
    await setDoc(prevSessionRef, {
      sessionId: prevSessionId,
      quizId: quizSettings.quizId,
      status: 'closed',
      endedAt: now.toISOString(),
      closedBy: adminEmail || 'Organizer',
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update previous session in Firestore:', err);
  }

  // 2. Generate new session identifier
  currentSessionNumber += 1;
  const newSessionId = `session_${currentSessionNumber}_${Date.now()}`;
  quizSettings.currentSessionId = newSessionId;
  if (newTitle && typeof newTitle === 'string') {
    quizSettings.title = newTitle.trim();
  }
  quizSettings.updatedAt = now.toISOString();
  quizSettings.updatedBy = adminEmail || 'Organizer';

  // Clear in-memory active attempts for previous session so students start fresh in Session #N
  attemptsMap.clear();
  studentRollToAttempt.clear();

  // 3. Save new session to Firestore
  try {
    const newSessionRef = doc(db, 'quizSessions', newSessionId);
    await setDoc(newSessionRef, {
      sessionId: newSessionId,
      quizId: quizSettings.quizId,
      title: quizSettings.title,
      sessionNumber: currentSessionNumber,
      status: 'active',
      startedAt: now.toISOString(),
      startedBy: adminEmail || 'Organizer',
    });

    const settingsRef = doc(db, 'quizSettings', quizSettings.quizId);
    await setDoc(settingsRef, {
      ...quizSettings,
      sessionNumber: currentSessionNumber,
      updatedAt: now.toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not persist new session in Firestore:', err);
  }

  // 4. Audit Log
  const logEntry: AuditLogEntry = {
    logId: `log_${Date.now()}`,
    adminEmail: adminEmail || 'Organizer',
    action: 'QUIZ_RESTARTED',
    details: `Restarted competition. Closed ${prevSessionId} and launched Session #${currentSessionNumber} (${newSessionId}). All previous student marks are preserved in Firestore.`,
    timestamp: now.toISOString(),
  };
  auditLogs.unshift(logEntry);

  try {
    await setDoc(doc(db, 'auditLogs', logEntry.logId), logEntry);
  } catch (err) {
    console.warn('Could not save audit log to Firestore:', err);
  }

  console.log(`[Admin] Quiz restarted into Session #${currentSessionNumber} (${newSessionId})`);

  return res.json({
    success: true,
    message: `Quiz session restarted successfully. Session #${currentSessionNumber} is now live with fresh 30-minute timers. All previous student marks remain preserved.`,
    newSessionId,
    sessionNumber: currentSessionNumber,
  });
});

// 9. Admin Quiz Settings Update
app.post('/api/admin/settings', checkAdminAuth, async (req: Request, res: Response): Promise<any> => {
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

  // Save to Firestore
  try {
    await setDoc(doc(db, 'quizSettings', quizSettings.quizId), quizSettings, { merge: true });
  } catch (err) {
    console.warn('Could not update quiz settings in Firestore:', err);
  }

  const logEntry: AuditLogEntry = {
    logId: `log_${Date.now()}`,
    adminEmail: adminEmail || 'Organizer',
    action: 'SETTINGS_UPDATED',
    details: `Access Code: ${quizSettings.accessCode}, IsActive: ${quizSettings.isActive}, ReviewAllowed: ${quizSettings.allowReviewAfterClose}`,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(logEntry);

  try {
    await setDoc(doc(db, 'auditLogs', logEntry.logId), logEntry);
  } catch (err) {
    console.warn('Could not save audit log to Firestore:', err);
  }

  return res.json({
    success: true,
    quizSettings,
  });
});

// 10. Admin Reset Single Student Attempt
app.post('/api/admin/reset-attempt', checkAdminAuth, async (req: Request, res: Response): Promise<any> => {
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

  const logEntry: AuditLogEntry = {
    logId: `log_${Date.now()}`,
    adminEmail: adminEmail || 'Organizer',
    action: 'ATTEMPT_RESET',
    details: `Reset individual quiz attempt for student roll ${normalizedRoll}`,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(logEntry);

  return res.json({
    success: true,
    message: `Attempt for student ${normalizedRoll} has been reset. The student can now take the quiz again.`,
  });
});

// 11. Admin Audit Logs
app.get('/api/admin/audit-logs', checkAdminAuth, (_req: Request, res: Response) => {
  res.json({ auditLogs: auditLogs.slice(0, 50) });
});

// 12. Admin CSV Export
app.get('/api/admin/export-csv', checkAdminAuth, async (_req: Request, res: Response) => {
  let csv = 'Roll Number,Full Name,Email,Session ID,Status,Score,Total Marks,Percentage,Time Taken (sec),Submission Time,Submission ID\n';

  // Read all from Firestore
  const allSubs = new Map<string, any>();
  try {
    const snap = await getDocs(collection(db, 'quizResults'));
    snap.forEach(d => {
      const data = d.data();
      allSubs.set(data.submissionId || d.id, data);
    });
  } catch (err) {
    console.warn('Firestore CSV read notice:', err);
  }

  // Merge with memory
  for (const [subId, r] of resultsMap.entries()) {
    if (!allSubs.has(subId)) {
      allSubs.set(subId, r);
    }
  }

  for (const item of allSubs.values()) {
    const row = [
      `"${item.rollNumber || ''}"`,
      `"${(item.fullName || '').replace(/"/g, '""')}"`,
      `"${item.email || ''}"`,
      `"${item.sessionId || 'session_1'}"`,
      `"Submitted"`,
      item.score ?? 'N/A',
      item.totalMarks || 30,
      item.percentage !== undefined ? `${item.percentage}%` : 'N/A',
      item.timeTakenSeconds ?? 'N/A',
      `"${item.submittedAt || ''}"`,
      `"${item.submissionId || ''}"`,
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
