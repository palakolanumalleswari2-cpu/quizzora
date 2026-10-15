export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: string;
  order: number;
  questionText: string;
  codeSnippet?: string;
  options: QuestionOption[];
}

export interface QuestionWithAnswer extends Question {
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface Student {
  id: string;
  fullName: string;
  rollNumber: string; // Normalized uppercase trimmed
  email: string;
  registeredAt: string;
  quizId: string;
  status: 'registered' | 'in_progress' | 'submitted';
}

export interface QuizAttempt {
  attemptId: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  email: string;
  quizId: string;
  startTime: number; // Epoch ms
  deadline: number; // Epoch ms
  submittedAt?: number;
  status: 'in_progress' | 'submitted' | 'expired' | 'reset';
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  submissionId?: string;
  lastSavedAt?: number;
}

export interface QuizResult {
  resultId: string;
  attemptId: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  email: string;
  quizId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeTakenSeconds: number;
  submittedAt: string;
  submissionId: string;
  questionReviews?: {
    questionId: string;
    questionText: string;
    selectedOption?: 'A' | 'B' | 'C' | 'D';
    correctOption: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface QuizSettings {
  quizId: string;
  title: string;
  accessCode: string;
  durationMinutes: number;
  totalQuestions: number;
  isActive: boolean;
  allowReviewAfterClose: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLogEntry {
  logId: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
}
