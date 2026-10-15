import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Flag,
  CheckCircle,
  AlertCircle,
  Loader2,
  Terminal,
  Hash,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Question } from '../types/quiz.js';

interface QuizExamPageProps {
  attemptId: string;
  student: {
    fullName: string;
    rollNumber: string;
  };
  questions: Question[];
  initialAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  deadlineEpochMs: number;
  onSubmitted: (submissionId: string) => void;
}

export const QuizExamPage: React.FC<QuizExamPageProps> = ({
  attemptId,
  student,
  questions,
  initialAnswers,
  deadlineEpochMs,
  onSubmitted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>(initialAnswers);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((deadlineEpochMs - Date.now()) / 1000));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const currentQuestion = questions[currentIndex] || questions[0];

  // Synchronized countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((deadlineEpochMs - now) / 1000));
      setRemainingSeconds(left);

      if (left <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineEpochMs]);

  // Debounced autosave
  const sendAutosave = useCallback(
    async (currentAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>) => {
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/quiz/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            answers: currentAnswers,
          }),
        });
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Autosave network error:', err);
        setSaveStatus('error');
      }
    },
    [attemptId]
  );

  const handleSelectOption = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;
    const updated = {
      ...answers,
      [currentQuestion.id]: optionKey,
    };
    setAnswers(updated);
    sendAutosave(updated);
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const updated = { ...answers };
    delete updated[currentQuestion.id];
    setAnswers(updated);
    sendAutosave(updated);
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    setFlagged(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          answers,
        }),
      });
      const data = await res.json();
      if (data.submissionId) {
        onSubmitted(data.submissionId);
      }
    } catch (err) {
      console.error('Auto submit error:', err);
    }
  };

  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          answers,
        }),
      });

      const data = await res.json();
      if (data.submissionId) {
        onSubmitted(data.submissionId);
      } else {
        alert(data.error || 'Submission error');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error while finalizing submission. Please retry.');
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirmModal || isSubmitting) return;

      if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (['1', 'a', 'A'].includes(e.key)) {
        handleSelectOption('A');
      } else if (['2', 'b', 'B'].includes(e.key)) {
        handleSelectOption('B');
      } else if (['3', 'c', 'C'].includes(e.key)) {
        handleSelectOption('C');
      } else if (['4', 'd', 'D'].includes(e.key)) {
        handleSelectOption('D');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length, showConfirmModal, isSubmitting, answers]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercentage = Math.round((answeredCount / questions.length) * 100);

  // Format MM:SS
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isTimeCritical = remainingSeconds <= 300; // Under 5 mins
  const isTimeUrgent = remainingSeconds <= 60; // Under 1 min

  return (
    <div className="py-4 space-y-6">
      {/* Sticky Top Exam Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sticky top-18 z-30 flex flex-wrap items-center justify-between gap-4">
        {/* Student & Quiz info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Quizzora Python & Tech Quiz
            </h2>
            <div className="flex items-center gap-2 text-2xs text-slate-500 font-medium">
              <span>{student.fullName}</span>
              <span>•</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                {student.rollNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Synchronized Timer */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-base font-bold transition-colors ${
              isTimeUrgent
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/20'
                : isTimeCritical
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeUrgent ? 'text-white' : 'text-indigo-600'}`} />
            <span>{formattedTimer}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Submit Quiz</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Status Line */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-normal">
              {answeredCount} Answered, {unansweredCount} Left
            </span>
            <span className="text-blue-700 font-bold">{progressPercentage}% Complete</span>
            {saveStatus === 'saving' && (
              <span className="text-2xs text-indigo-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Autosaving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-2xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-blue-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question & Options (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
              Question {currentIndex + 1}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  flagged[currentQuestion?.id]
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged[currentQuestion?.id] ? 'Flagged for Review' : 'Mark for Review'}</span>
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentQuestion?.questionText}
            </h3>

            {/* Syntax Highlighted Code Snippet */}
            {currentQuestion?.codeSnippet && (
              <div className="rounded-2xl bg-slate-950 p-4 font-mono text-sm text-slate-100 overflow-x-auto border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-2xs text-slate-500 pb-2 border-b border-slate-800 mb-2">
                  <span>Python Source</span>
                  <span>python 3.x</span>
                </div>
                <pre className="text-emerald-400 whitespace-pre font-mono leading-relaxed">
                  {currentQuestion.codeSnippet}
                </pre>
              </div>
            )}
          </div>

          {/* 4 Options Grid */}
          <div className="space-y-3 pt-2">
            {currentQuestion?.options.map(option => {
              const isSelected = answers[currentQuestion.id] === option.key;

              return (
                <div
                  key={option.key}
                  onClick={() => handleSelectOption(option.key)}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {option.key}
                  </div>
                  <span
                    className={`text-sm sm:text-base leading-relaxed ${
                      isSelected ? 'font-semibold text-blue-950' : 'text-slate-700'
                    }`}
                  >
                    {option.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {answers[currentQuestion?.id] && (
                <button
                  onClick={handleClearResponse}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Selection</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigator Grid (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Question Navigator
            </h4>
            <p className="text-2xs text-slate-500">
              Jump directly to any of the 30 questions
            </p>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-2xs text-slate-600 border-y border-slate-100 py-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-600"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300"></span>
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500"></span>
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md ring-2 ring-indigo-600 bg-white"></span>
              <span>Current Question</span>
            </div>
          </div>

          {/* 30 Question Grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              const isFlagged = flagged[q.id];

              let bgClasses = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
              if (isAnswered) {
                bgClasses = 'bg-blue-600 text-white font-bold hover:bg-blue-700 border-blue-600';
              }
              if (isFlagged) {
                bgClasses = 'bg-amber-500 text-white font-bold hover:bg-amber-600 border-amber-600';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl text-xs font-mono font-semibold border flex items-center justify-center transition-all cursor-pointer ${bgClasses} ${
                    isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts Helper */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-2xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Keyboard Shortcuts:</p>
            <p>• Press <strong>1, 2, 3, 4</strong> or <strong>A, B, C, D</strong> to select</p>
            <p>• Press <strong>←</strong> and <strong>→</strong> arrows to navigate</p>
          </div>
        </div>
      </div>

      {/* Confirmation Submission Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Confirm Quiz Submission
              </h3>
              <p className="text-xs text-slate-500">
                Once submitted, your answers will be automatically marked on the server. You cannot modify your answers or retake this quiz.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <p className="text-slate-500 font-medium">Answered</p>
                <p className="text-lg font-bold text-blue-600 font-mono">{answeredCount}</p>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <p className="text-slate-500 font-medium">Unanswered</p>
                <p className="text-lg font-bold text-amber-600 font-mono">{unansweredCount}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Review Answers
              </button>

              <button
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Grading...</span>
                  </>
                ) : (
                  <span>Yes, Submit Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
