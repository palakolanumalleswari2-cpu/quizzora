import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { HomePage } from './pages/HomePage.js';
import { StudentLoginPage } from './pages/StudentLoginPage.js';
import { InstructionsPage } from './pages/InstructionsPage.js';
import { QuizExamPage } from './pages/QuizExamPage.js';
import { ResultPage } from './pages/ResultPage.js';
import { AdminLoginPage } from './pages/AdminLoginPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { UnauthorizedPage } from './pages/UnauthorizedPage.js';
import { Student, Question, QuizResult } from './types/quiz.js';

export default function App() {
  // Direct student login is the primary landing view for all participants
  const [currentView, setCurrentView] = useState<string>('login');
  
  const [student, setStudent] = useState<Student | null>(() => {
    try {
      const saved = sessionStorage.getItem('quizzora_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [verificationToken, setVerificationToken] = useState<string | null>(() => {
    return sessionStorage.getItem('quizzora_token');
  });

  // Quiz active exam session state
  const [attemptId, setAttemptId] = useState<string | null>(() => {
    return sessionStorage.getItem('quizzora_attempt_id');
  });

  const [deadlineEpochMs, setDeadlineEpochMs] = useState<number | null>(() => {
    const val = sessionStorage.getItem('quizzora_deadline');
    return val ? parseInt(val, 10) : null;
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [finalResult, setFinalResult] = useState<QuizResult | null>(null);

  // Admin session state
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('quizzora_admin_email');
  });

  // Quiz operational metadata
  const [quizInfo, setQuizInfo] = useState<any>(null);

  // Fetch initial quiz info
  useEffect(() => {
    fetch('/api/quiz/info')
      .then(res => res.json())
      .then(data => setQuizInfo(data))
      .catch(err => console.error('Failed to load quiz info:', err));
  }, []);

  // Sync session storage
  useEffect(() => {
    if (student) {
      sessionStorage.setItem('quizzora_student', JSON.stringify(student));
    } else {
      sessionStorage.removeItem('quizzora_student');
    }
  }, [student]);

  useEffect(() => {
    if (verificationToken) {
      sessionStorage.setItem('quizzora_token', verificationToken);
    } else {
      sessionStorage.removeItem('quizzora_token');
    }
  }, [verificationToken]);

  useEffect(() => {
    if (attemptId) {
      sessionStorage.setItem('quizzora_attempt_id', attemptId);
    } else {
      sessionStorage.removeItem('quizzora_attempt_id');
    }
  }, [attemptId]);

  useEffect(() => {
    if (deadlineEpochMs) {
      sessionStorage.setItem('quizzora_deadline', deadlineEpochMs.toString());
    } else {
      sessionStorage.removeItem('quizzora_deadline');
    }
  }, [deadlineEpochMs]);

  useEffect(() => {
    if (adminEmail) {
      sessionStorage.setItem('quizzora_admin_email', adminEmail);
    } else {
      sessionStorage.removeItem('quizzora_admin_email');
    }
  }, [adminEmail]);

  // Handle successful direct student login
  const handleLoginSuccess = (
    loggedInStudent: Student,
    token: string,
    alreadySubmitted?: boolean,
    submissionId?: string
  ) => {
    setStudent(loggedInStudent);
    setVerificationToken(token);

    // If student has already submitted, directly display their finalized result
    if (alreadySubmitted && submissionId) {
      fetchResultAndDisplay(submissionId);
      return;
    }

    // Direct transition to instructions
    setCurrentView('instructions');
  };

  // Start or resume quiz attempt (locks timer on server)
  const handleStartQuiz = async () => {
    if (!student || !verificationToken) {
      setCurrentView('login');
      return;
    }

    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: student.rollNumber,
          verificationToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadySubmitted && data.submissionId) {
          fetchResultAndDisplay(data.submissionId);
        } else {
          alert(data.error || 'Failed to start quiz attempt.');
        }
        return;
      }

      setAttemptId(data.attemptId);
      setDeadlineEpochMs(data.deadline);
      setQuestions(data.questions || []);
      setSavedAnswers(data.savedAnswers || {});
      setCurrentView('quiz');
    } catch (err) {
      console.error('Start quiz network error:', err);
      alert('Could not connect to exam server. Please check your internet connection.');
    }
  };

  // Fetch verified student result
  const fetchResultAndDisplay = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/quiz/result/${submissionId}`);
      if (res.ok) {
        const resultData = await res.json();
        setFinalResult(resultData);
        setCurrentView('result');
        // Clear active attempt session
        setAttemptId(null);
        setDeadlineEpochMs(null);
      }
    } catch (err) {
      console.error('Fetch result error:', err);
    }
  };

  const handleQuizSubmitted = (submissionId: string) => {
    fetchResultAndDisplay(submissionId);
  };

  const handleAdminAuthenticated = (email: string) => {
    setAdminEmail(email);
    setCurrentView('admin-dashboard');
  };

  const handleAdminLogout = () => {
    setAdminEmail(null);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-50 via-blue-50/20 to-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        studentRoll={student?.rollNumber}
        studentName={student?.fullName}
        isAdmin={!!adminEmail}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Direct Student Login (Primary Entrance) */}
        {currentView === 'login' && (
          <StudentLoginPage
            onLoginSuccess={handleLoginSuccess}
            onNavigateOrganizer={() => setCurrentView('admin-login')}
            initialRollNumber={student?.rollNumber}
          />
        )}

        {/* Competition Rules & Info Overview */}
        {currentView === 'home' && (
          <HomePage onNavigate={setCurrentView} quizInfo={quizInfo} />
        )}

        {/* Instructions & Readiness Check */}
        {currentView === 'instructions' && student && (
          <InstructionsPage
            student={student}
            onStartQuiz={handleStartQuiz}
            onNavigate={setCurrentView}
          />
        )}

        {/* Active Quiz Examination Interface */}
        {currentView === 'quiz' && attemptId && deadlineEpochMs && student && (
          <QuizExamPage
            attemptId={attemptId}
            student={student}
            questions={questions}
            initialAnswers={savedAnswers}
            deadlineEpochMs={deadlineEpochMs}
            onSubmitted={handleQuizSubmitted}
          />
        )}

        {/* Individual Student Result Scorecard */}
        {currentView === 'result' && finalResult && (
          <ResultPage
            result={finalResult}
            onNavigateHome={() => setCurrentView('login')}
          />
        )}

        {/* Organizer Secure Sign-in */}
        {currentView === 'admin-login' && (
          <AdminLoginPage
            onAdminAuthenticated={handleAdminAuthenticated}
            onNavigate={setCurrentView}
          />
        )}

        {/* Organizer Control Dashboard */}
        {currentView === 'admin-dashboard' && adminEmail && (
          <AdminDashboardPage
            adminEmail={adminEmail}
            onLogout={handleAdminLogout}
            onNavigateHome={() => setCurrentView('login')}
          />
        )}

        {/* Unauthorized View */}
        {currentView === 'unauthorized' && (
          <UnauthorizedPage onNavigateHome={() => setCurrentView('login')} />
        )}
      </main>

      {/* Footer (hidden during active quiz) */}
      {currentView !== 'quiz' && <Footer onNavigate={setCurrentView} />}
    </div>
  );
}
