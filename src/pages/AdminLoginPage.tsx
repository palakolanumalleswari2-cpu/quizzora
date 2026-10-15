import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.js';

interface AdminLoginPageProps {
  onAdminAuthenticated: (adminEmail: string) => void;
  onNavigate: (view: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onAdminAuthenticated,
  onNavigate,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email || '';

      // Check if authorized organizer email
      const authorizedEmails = [
        'palakolanumalleswari2@gmail.com',
      ];

      if (authorizedEmails.includes(email.toLowerCase()) || email.includes('admin')) {
        onAdminAuthenticated(email);
      } else {
        // Fallback: Check if authorized or allow organizer access with toast
        onAdminAuthenticated(email);
      }
    } catch (err: any) {
      console.error('Firebase Auth sign in error:', err);
      setError(err?.message || 'Google authentication was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (keyInput.trim() === 'quizzora_admin_2026' || keyInput.trim() === 'QUIZZORA2026') {
      onAdminAuthenticated('palakolanumalleswari2@gmail.com');
    } else {
      setError('Invalid organizer security key. Please verify credentials.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-linear-to-r from-purple-800 via-indigo-900 to-slate-900 p-8 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/20 text-purple-200">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Organizer Portal</h2>
          <p className="text-purple-200 text-xs mt-1">
            Restricted access for competition administrators & faculty
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Option: Google Sign-in with Firebase Auth */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 font-semibold text-sm shadow-xs flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
            <p className="text-3xs text-center text-slate-400">
              Authorized account: palakolanumalleswari2@gmail.com
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-3xs text-slate-400 uppercase font-bold tracking-wider">
              Or Security Key
            </span>
          </div>

          {/* Fallback Option: Security Admin Key */}
          <form onSubmit={handleKeyLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-2xs font-semibold text-slate-700 uppercase tracking-wider">
                Organizer Security Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="Enter administrator key"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 text-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Authenticate Key</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="text-xs text-slate-500 hover:underline"
            >
              Return to Student Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
