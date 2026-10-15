import React from 'react';
import { ShieldX, ArrowLeft } from 'lucide-react';

interface UnauthorizedPageProps {
  onNavigateHome: () => void;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ onNavigateHome }) => {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
        <ShieldX className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-slate-600">
          You do not have organizer authorization to view this resource. Student accounts are restricted to the quiz-taking interface.
        </p>
      </div>

      <div>
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Competition Home</span>
        </button>
      </div>
    </div>
  );
};
