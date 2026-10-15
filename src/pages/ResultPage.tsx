import React, { useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Terminal,
  FileCheck,
  ShieldCheck,
  HelpCircle,
  Hash,
  Mail,
  User,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizResult } from '../types/quiz.js';

interface ResultPageProps {
  result: QuizResult;
  onNavigateHome: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ result, onNavigateHome }) => {
  // Trigger celebration confetti on mount if score is good
  useEffect(() => {
    if (result.score >= 18) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe catch for environment without canvas
      }
    }
  }, [result.score]);

  const handlePrint = () => {
    window.print();
  };

  // Performance classification
  let performanceBadge = {
    title: 'Participant',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Good effort in the technical competition.',
  };
  if (result.score >= 26) {
    performanceBadge = {
      title: 'Distinction / Outstanding Mastery',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      description: 'Exceptional command of Python and computer science fundamentals!',
    };
  } else if (result.score >= 20) {
    performanceBadge = {
      title: 'Proficient / High Honors',
      color: 'bg-blue-50 text-blue-800 border-blue-300',
      description: 'Demonstrated solid technical understanding and algorithmic thinking.',
    };
  } else if (result.score >= 15) {
    performanceBadge = {
      title: 'Merit / Competent',
      color: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      description: 'Good grasp of core concepts with room for advanced mastery.',
    };
  }

  const minutesTaken = Math.floor(result.timeTakenSeconds / 60);
  const secondsTaken = result.timeTakenSeconds % 60;
  const timeTakenFormatted = `${minutesTaken}m ${secondsTaken}s`;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 print:p-0 print:m-0">
      {/* Print-only CSS styling */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          header, footer, .no-print { display: none !important; }
          .printable-card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
      `}</style>

      {/* Main Scorecard Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden printable-card">
        {/* Card Header */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">QUIZZORA</h1>
                <p className="text-indigo-200 text-xs">Official Competition Scorecard & Receipt</p>
              </div>
            </div>

            <div className="no-print flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Student & Submission Identity Banner */}
        <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">
              Candidate Name
            </span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <User className="w-4 h-4 text-blue-600" />
              <span>{result.fullName}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">
              College Roll Number
            </span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-900 text-sm">
              <Hash className="w-4 h-4 text-indigo-600" />
              <span>{result.rollNumber}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">
              Submission Receipt ID
            </span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800 text-sm truncate">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{result.submissionId}</span>
            </div>
          </div>
        </div>

        {/* Score Summary Showcase */}
        <div className="p-6 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Score Ring / Number */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-linear-to-b from-blue-50/50 via-indigo-50/40 to-purple-50/30 border border-indigo-100 text-center">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
                Overall Final Score
              </span>
              <div className="text-6xl font-extrabold tracking-tight text-slate-900 font-mono">
                {result.score}
                <span className="text-2xl text-slate-400 font-normal"> / 30</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-bold shadow-xs">
                <span>{result.percentage}%</span>
                <span>Marks</span>
              </div>
            </div>

            {/* Performance Level */}
            <div className="md:col-span-7 space-y-4">
              <div className={`p-5 rounded-2xl border ${performanceBadge.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-5 h-5" />
                  <h3 className="font-bold text-base">{performanceBadge.title}</h3>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{performanceBadge.description}</p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                  </p>
                  <p className="text-xl font-bold font-mono text-emerald-900 mt-0.5">
                    {result.correctCount}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <p className="text-rose-700 font-semibold flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect
                  </p>
                  <p className="text-xl font-bold font-mono text-rose-900 mt-0.5">
                    {result.incorrectCount}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
                  <p className="text-slate-600 font-semibold flex items-center justify-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Skipped
                  </p>
                  <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                    {result.unansweredCount}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-2xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Time Spent: <strong>{timeTakenFormatted}</strong>
                </span>
                <span>
                  Submitted:{' '}
                  <strong>{new Date(result.submittedAt).toLocaleTimeString()}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Question Review (If permitted by organizer after quiz closes) */}
          {result.questionReviews && result.questionReviews.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Official Question & Answer Review</h3>
              <p className="text-xs text-slate-500">
                Authorized review unlocked by exam coordinator following competition closure.
              </p>

              <div className="space-y-3">
                {result.questionReviews.map((rev, idx) => (
                  <div
                    key={rev.questionId}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      rev.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : rev.selectedOption
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>Question {idx + 1}</span>
                      <span
                        className={
                          rev.isCorrect
                            ? 'text-emerald-700'
                            : rev.selectedOption
                            ? 'text-rose-700'
                            : 'text-slate-500'
                        }
                      >
                        {rev.isCorrect
                          ? '✓ Correct (+1 Mark)'
                          : rev.selectedOption
                          ? '✗ Incorrect (0 Marks)'
                          : '— Unanswered'}
                      </span>
                    </div>

                    <p className="font-medium text-slate-800">{rev.questionText}</p>

                    <div className="flex gap-4 font-mono text-2xs">
                      <span>
                        Your Choice: <strong>{rev.selectedOption || 'None'}</strong>
                      </span>
                      <span>
                        Correct Answer: <strong className="text-emerald-700">{rev.correctOption}</strong>
                      </span>
                    </div>

                    <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 text-2xs">
                      <strong>Explanation:</strong> {rev.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Back Home */}
          <div className="no-print pt-4 flex justify-center">
            <button
              onClick={onNavigateHome}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
