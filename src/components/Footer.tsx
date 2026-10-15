import React from 'react';
import { Terminal, ShieldCheck, Clock, Award, BookOpen } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                QUIZZORA
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              *Think Fast. Answer Smart. Score High.* A high-integrity online Python & Technology quiz competition platform designed for college symposiums and computer science hackathons.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Server-Validated Timer
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                30-Minute Limit
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                30 Marks
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Participant Hub
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-white transition-colors"
                >
                  Competition Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('register')}
                  className="hover:text-white transition-colors"
                >
                  Student Registration
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('access-code')}
                  className="hover:text-white transition-colors"
                >
                  Access Code Login
                </button>
              </li>
            </ul>
          </div>

          {/* Organizer Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Organizer Administration
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('admin-login')}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <span>Organizer Dashboard</span>
                </button>
              </li>
              <li className="text-xs text-slate-500">
                Authorized Admin: <br />
                <span className="font-mono text-slate-400">palakolanumalleswari2@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Quizzora Competition Platform. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Official Python & Tech Challenge</span>
            <span>•</span>
            <span>30 Questions MCQ</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
