import React, { useState, useEffect } from 'react';
import {
  User,
  Hash,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Award,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { Student } from '../types/quiz.js';

interface StudentLoginPageProps {
  onLoginSuccess: (student: Student, token: string, alreadySubmitted?: boolean, submissionId?: string) => void;
  onNavigateOrganizer: () => void;
  initialRollNumber?: string;
}

export const StudentLoginPage: React.FC<StudentLoginPageProps> = ({
  onLoginSuccess,
  onNavigateOrganizer,
  initialRollNumber,
}) => {
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState(initialRollNumber || '');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // Auto-fill from sessionStorage if previously entered
  useEffect(() => {
    try {
      const savedStudent = sessionStorage.getItem('quizzora_student');
      if (savedStudent) {
        const parsed = JSON.parse(savedStudent);
        if (parsed.fullName && !fullName) setFullName(parsed.fullName);
        if (parsed.rollNumber && !rollNumber) setRollNumber(parsed.rollNumber);
        if (parsed.email && !email) setEmail(parsed.email);
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Countdown timer for security lockout
  useEffect(() => {
    if (lockoutSeconds && lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev && prev > 1) return prev - 1;
          setError(null);
          return null;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds && lockoutSeconds > 0) return;

    setError(null);

    // 1. Validate Full Name
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please provide your legal or official Full Name (at least 2 characters).');
      return;
    }

    // 2. Validate & Normalize Roll Number
    const cleanRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanRoll || cleanRoll.length < 2) {
      setError('Please enter a valid College Roll Number / Student ID.');
      return;
    }

    // 3. Validate Email
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 4. Validate Access Code
    const cleanCode = accessCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter the Quiz Access Code provided by your coordinator.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/student/direct-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          rollNumber: cleanRoll,
          email: cleanEmail,
          accessCode: cleanCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.locked && data.remainingSeconds) {
          setLockoutSeconds(data.remainingSeconds);
        }
        setError(data.error || 'Login verification failed. Please try again.');
        setLoading(false);
        return;
      }

      // Check if student already submitted this quiz
      if (data.alreadySubmitted && data.submissionId) {
        onLoginSuccess(data.student, data.verificationToken, true, data.submissionId);
        return;
      }

      // Successful Direct Login! Proceed to Instructions and Start Quiz
      onLoginSuccess(data.student, data.verificationToken, false);
    } catch (err) {
      console.error('Direct login network error:', err);
      setError('Network connection error. Could not connect to Quizzora servers. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-8 px-2 sm:px-0">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all">
        {/* Visual Hero Header */}
        <div className="relative overflow-hidden bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white text-center">
          <div className="absolute -right-12 -top-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto shadow-inner border border-white/20">
              <Terminal className="w-7 h-7 text-white" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-100 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Python & Tech Competition</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Quizzora Student Login
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm font-medium italic max-w-md mx-auto">
              "Think Fast. Answer Smart. Score High."
            </p>
          </div>
        </div>

        {/* Feature Badges Row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-b border-slate-200 text-center py-2.5 px-3 text-2xs sm:text-xs text-slate-600 font-medium">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>30 Mins</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>30 MCQs</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>1 Attempt</span>
          </div>
        </div>

        {/* Direct Login Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Login Notification</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
                {lockoutSeconds ? (
                  <p className="mt-1 font-mono text-xs font-semibold text-rose-700">
                    Security cooldown: {lockoutSeconds}s remaining
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* 1. Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. John Doe / Priya Sharma"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 text-sm placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* 2. College Roll Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. College Roll Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                autoComplete="off"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="e.g. 21CS042 or 2024-IT-109"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 font-mono text-sm uppercase placeholder:text-slate-400 transition-all"
              />
            </div>
            <p className="text-3xs text-slate-400">
              Only one attempt permitted per roll number.
            </p>
          </div>

          {/* 3. Email ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Email ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. priya.student@college.edu"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 text-sm placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* 4. Quiz Access Code */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Quiz Access Code <span className="text-rose-500">*</span>
              </label>
              <span className="text-3xs font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                Default: QUIZZORA2026
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                disabled={lockoutSeconds !== null && lockoutSeconds > 0}
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                placeholder="Enter access code from coordinator"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 font-mono text-sm tracking-wider uppercase placeholder:text-slate-400 transition-all disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Action Button: LOGIN & START QUIZ */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (lockoutSeconds !== null && lockoutSeconds > 0)}
              className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying & Preparing Exam...</span>
                </>
              ) : (
                <>
                  <span>LOGIN & START QUIZ</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Organizer Link */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Are you a faculty or competition organizer?</span>
            <button
              type="button"
              onClick={onNavigateOrganizer}
              className="text-purple-700 hover:text-purple-900 font-semibold underline cursor-pointer"
            >
              Organizer Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
