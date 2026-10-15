import React from 'react';
import { Sparkles, Shield, User, Award, Terminal } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  studentRoll?: string | null;
  studentName?: string | null;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  studentRoll,
  studentName,
  isAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-indigo-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent">
                  QUIZZORA
                </span>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Tech Competition
                </span>
              </div>
              <p className="text-3xs text-slate-500 font-medium hidden sm:block">
                Think Fast. Answer Smart. Score High.
              </p>
            </div>
          </div>

          {/* Navigation & Contextual Badges */}
          <div className="flex items-center gap-3">
            {studentRoll && currentView !== 'quiz' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate max-w-[120px]">{studentName || 'Student'}</span>
                <span className="text-blue-400">|</span>
                <span className="font-mono text-2xs bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">
                  {studentRoll}
                </span>
              </div>
            )}

            {currentView !== 'quiz' && (
              <>
                <button
                  onClick={() => onNavigate('home')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    currentView === 'home'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Home
                </button>

                <button
                  onClick={() => onNavigate('register')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    currentView === 'register' || currentView === 'access-code' || currentView === 'instructions'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  Student Entry
                </button>

                <button
                  onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'admin-login')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    currentView.startsWith('admin')
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Organizer</span>
                </button>
              </>
            )}

            {currentView === 'quiz' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Active Exam Session</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
