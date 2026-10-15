import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Terminal,
  FileCheck,
  Layers,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string) => void;
  quizInfo?: {
    title: string;
    durationMinutes: number;
    totalQuestions: number;
    isActive: boolean;
  };
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, quizInfo }) => {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-8 sm:p-12 lg:p-16 shadow-2xl border border-indigo-900/50">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Annual College Technical Competition</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Master the Code with{' '}
            <span className="bg-linear-to-r from-blue-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
              Quizzora
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-indigo-100/90 font-medium italic">
            "Think Fast. Answer Smart. Score High."
          </p>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            Test your programming prowess in Python and modern computing. 30 precision multiple-choice questions, 30 minutes on the clock, and real-time server-side evaluation.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm sm:text-base cursor-pointer"
            >
              <span>Student Login & Start Quiz</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="pt-2 flex items-center gap-3 text-xs text-indigo-200">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${quizInfo?.isActive !== false ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${quizInfo?.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span>
              Competition Status:{' '}
              <strong className={quizInfo?.isActive !== false ? 'text-emerald-300' : 'text-rose-300'}>
                {quizInfo?.isActive !== false ? 'Active & Open' : 'Closed by Organizer'}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">30 Questions</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Curated questions covering Python syntax, operators, functions, data structures, and OOP.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">30 Minutes Timer</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Server-synchronized countdown. Auto-submits answers immediately when the timer hits zero.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">One Single Attempt</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            College roll numbers are strictly verified to prevent duplicate submissions or unfair retakes.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">Auto-Evaluation</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            30 total marks (1 mark per question). Instant private scorecard with verifiable submission receipt.
          </p>
        </div>
      </section>

      {/* Rules and Guidelines Section */}
      <section className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Official Competition Rules & Instructions
            </h2>
            <p className="text-sm text-slate-500">
              Read carefully before entering the examination hall
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-slate-900 block font-semibold mb-0.5">
                Direct Student Entry
              </strong>
              <span className="text-slate-600">
                Provide your official Full Name, College Roll Number, Email ID, and Quiz Access Code. No sign-up or account creation required. Only one attempt is permitted per roll number.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-slate-900 block font-semibold mb-0.5">
                Organizer Access Code
              </strong>
              <span className="text-slate-600">
                You must possess the shared Quiz Access Code provided by your exam coordinator to enter the quiz session.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-slate-900 block font-semibold mb-0.5">
                Scoring Scheme
              </strong>
              <span className="text-slate-600">
                Each correct answer awards <strong>1 mark</strong>. There is <strong>no negative marking</strong> for incorrect or unanswered questions. Maximum score is 30.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-slate-900 block font-semibold mb-0.5">
                Timer & Autosave
              </strong>
              <span className="text-slate-600">
                The 30-minute timer runs on the server. Selected answers are automatically saved. If the timer reaches 00:00, all current answers are submitted instantly.
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Important Anti-Cheating & Integrity Notice:</strong> Answers and timer deadlines are maintained strictly on the server. Navigating between questions or refreshing will restore your saved answers without granting extra time.
          </p>
        </div>
      </section>
    </div>
  );
};
