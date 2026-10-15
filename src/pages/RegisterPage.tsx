import React, { useState } from 'react';
import { User, Hash, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Student } from '../types/quiz.js';

interface RegisterPageProps {
  onSuccess: (student: Student) => void;
  onNavigate: (view: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSuccess, onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend pre-validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your legal or official Full Name (at least 2 characters).');
      return;
    }

    const cleanRoll = rollNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanRoll || cleanRoll.length < 2) {
      setError('Please enter a valid College Roll Number / Student ID.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please enter a valid college or personal email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          rollNumber: cleanRoll,
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadySubmitted) {
          setError(data.error);
        } else {
          setError(data.error || 'Failed to register student. Please check details.');
        }
        setLoading(false);
        return;
      }

      // Registration successful! Forward to Access Code Login page (NOT starting quiz yet)
      onSuccess(data.student);
    } catch (err) {
      console.error('Registration network error:', err);
      setError('Could not connect to registration server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Student Registration</h2>
          <p className="text-indigo-100 text-sm mt-1">
            Step 1 of 3: Provide your participant credentials
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Issue</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              1. Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. John Doe / Priya Sharma"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 text-sm placeholder:text-slate-400 transition-all"
              />
            </div>
            <p className="text-2xs text-slate-400">
              Must match your official college records.
            </p>
          </div>

          {/* College Roll Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              2. College Roll Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="e.g. 21CS042 or 2024-IT-109"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 font-mono text-sm placeholder:text-slate-400 uppercase transition-all"
              />
            </div>
            <p className="text-2xs text-slate-400">
              Unique identifier. Automatically normalized to prevent duplicate attempts.
            </p>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              3. Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. priya.student@college.edu"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-slate-900 text-sm placeholder:text-slate-400 transition-all"
              />
            </div>
            <p className="text-2xs text-slate-400">
              Your official scorecard receipt will be linked to this address.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold text-sm shadow-md shadow-blue-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Save & Proceed to Access Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onNavigate('access-code')}
              className="text-xs text-blue-700 hover:underline font-medium"
            >
              Already registered? Enter your Quiz Access Code directly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
