import React, { useState } from 'react';
import {
  FileCheck2,
  Clock,
  Award,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle,
  Wifi,
  ShieldCheck,
  User,
  Hash,
} from 'lucide-react';

interface InstructionsPageProps {
  student: {
    fullName: string;
    rollNumber: string;
    email?: string;
  };
  onStartQuiz: () => Promise<void>;
  onNavigate: (view: string) => void;
}

export const InstructionsPage: React.FC<InstructionsPageProps> = ({
  student,
  onStartQuiz,
  onNavigate,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [systemReady, setSystemReady] = useState(true);

  const handleStart = async () => {
    if (!acceptedTerms) return;
    setIsStarting(true);
    try {
      await onStartQuiz();
    } catch (err) {
      console.error('Failed to start quiz:', err);
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden space-y-6">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 border border-white/20">
                Final Pre-Exam Check
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
                Quizzora Python & Technology Exam
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                Please review rules and confirm readiness before triggering your 30-minute exam timer.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6 pt-0">
          {/* Candidate Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">
                  Verified Candidate
                </p>
                <p className="text-base font-bold text-slate-900">{student.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 font-mono text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>{student.rollNumber}</span>
              </div>
            </div>
          </div>

          {/* Readiness Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-800">Connection Status</p>
                <p className="text-emerald-600 font-medium">Online & Synced</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-semibold text-slate-800">Timer Duration</p>
                <p className="text-slate-600 font-medium">30:00 Minutes</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Award className="w-4 h-4 text-purple-600" />
              <div>
                <p className="font-semibold text-slate-800">Total Marks</p>
                <p className="text-slate-600 font-medium">30 Marks (No -ve)</p>
              </div>
            </div>
          </div>

          {/* Rules Overview */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <span>Examination Rules & Protocols</span>
            </h3>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  <strong>Total of 30 Multiple Choice Questions (MCQs):</strong> Each question contains 4 options with exactly 1 correct answer.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  <strong>Timer Starts on Click:</strong> Your 30-minute exam timer starts immediately upon clicking <em>Start Quiz</em> below and runs on the server.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  <strong>Real-Time Autosave:</strong> As you select answers, they are automatically saved. If your connection flickers, refreshing the page will restore your progress without resetting the countdown.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <p>
                  <strong>Automatic Evaluation & Submission:</strong> When the countdown reaches 00:00, all current responses will be submitted automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgement Checkbox */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 flex items-start gap-3">
            <input
              id="rules-check"
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
            />
            <label htmlFor="rules-check" className="text-xs sm:text-sm text-slate-800 cursor-pointer select-none">
              I confirm that I am <strong>{student.fullName}</strong> (Roll: {student.rollNumber}) and I understand the 30-minute single-attempt competition rules.
            </label>
          </div>

          {/* Start Button */}
          <div className="pt-2">
            <button
              onClick={handleStart}
              disabled={!acceptedTerms || isStarting}
              className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-indigo-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initiating Exam Session on Server...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Quiz (30:00 Timer Begins)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
