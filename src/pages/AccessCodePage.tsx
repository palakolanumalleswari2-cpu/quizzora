import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, ArrowRight, Loader2, User, Hash, Lock } from 'lucide-react';
import { Student } from '../types/quiz.js';

interface AccessCodePageProps {
  student: Student | null;
  onCodeVerified: (token: string, studentData: any) => void;
  onNavigate: (view: string) => void;
}

export const AccessCodePage: React.FC<AccessCodePageProps> = ({
  student,
  onCodeVerified,
  onNavigate,
}) => {
  const [rollNumber, setRollNumber] = useState(student?.rollNumber || '');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (student?.rollNumber) {
      setRollNumber(student.rollNumber);
    }
  }, [student]);

  // Countdown timer for temporary lockout
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds && lockoutSeconds > 0) return;

    setError(null);

    const cleanRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanRoll) {
      setError('Please provide your registered College Roll Number.');
      return;
    }

    if (!accessCode.trim()) {
      setError('Please enter the Quiz Access Code.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/quiz/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: cleanRoll,
          accessCode: accessCode.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.locked && data.remainingSeconds) {
          setLockoutSeconds(data.remainingSeconds);
        }
        setError(data.error || 'Access verification failed.');
        setLoading(false);
        return;
      }

      // Success! Pass verification token and proceed to instructions
      onCodeVerified(data.verificationToken, data.student);
    } catch (err) {
      console.error('Access code verification error:', err);
      setError('Connection failure. Could not contact the security verification gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-linear-to-r from-indigo-700 via-purple-700 to-blue-800 p-8 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Quiz Access Code Login</h2>
          <p className="text-indigo-100 text-sm mt-1">
            Step 2 of 3: Enter the coordinator's authorized access key
          </p>
        </div>

        {/* Registered Student Badge */}
        {student ? (
          <div className="bg-indigo-50/60 border-b border-indigo-100 px-6 py-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-medium">
              <User className="w-4 h-4 text-indigo-600" />
              <span>{student.fullName}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-800 font-semibold">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>{student.rollNumber}</span>
            </div>
          </div>
        ) : null}

        {/* Form Body */}
        <form onSubmit={handleVerify} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Access Authorization Failed</p>
                <p>{error}</p>
                {lockoutSeconds ? (
                  <p className="mt-1 font-mono text-xs font-semibold text-rose-700">
                    Security cooldown: {lockoutSeconds}s remaining
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {!student && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                College Roll Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="e.g. 21CS042"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 text-slate-900 font-mono text-sm uppercase placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Access Code Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Quiz Access Code <span className="text-rose-500">*</span>
              </label>
              <span className="text-2xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                Hint: QUIZZORA2026
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                disabled={lockoutSeconds !== null && lockoutSeconds > 0}
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                placeholder="Enter access code provided by organizer"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 text-slate-900 font-mono tracking-wider font-semibold text-base placeholder:text-slate-400 uppercase disabled:bg-slate-100"
              />
            </div>
            <p className="text-2xs text-slate-500">
              Verified strictly against the secure backend server. Multiple incorrect attempts trigger temporary rate-limit lockouts.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (lockoutSeconds !== null && lockoutSeconds > 0)}
              className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code on Server...</span>
                </>
              ) : (
                <>
                  <span>Verify Code & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Need to register first? Return to Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
