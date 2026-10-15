import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  Search,
  Download,
  RotateCcw,
  RefreshCw,
  Key,
  Shield,
  LogOut,
  ArrowUpDown,
  BookOpen,
  Layers,
  FileCheck2,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { MASTER_QUESTIONS } from '../data/quizQuestions.js';
import { db } from '../lib/firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AdminDashboardPageProps {
  adminEmail: string;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  adminEmail,
  onLogout,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'settings' | 'questions' | 'audit'>('submissions');
  const [metrics, setMetrics] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sortField, setSortField] = useState<'score' | 'rollNumber' | 'fullName' | 'submittedAt'>('submittedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Settings State
  const [newAccessCode, setNewAccessCode] = useState('');
  const [isQuizActive, setIsQuizActive] = useState(true);
  const [allowReview, setAllowReview] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Restart Session State & Confirmation Dialog
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartSuccessMsg, setRestartSuccessMsg] = useState<string | null>(null);
  const [restartErrorMsg, setRestartErrorMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = {
        'x-user-email': adminEmail,
        'x-admin-key': 'quizzora_admin_2026',
      };

      const [metricsRes, subsRes, logsRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/submissions', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
      ]);

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData);
        setNewAccessCode(mData.accessCode || '');
        setIsQuizActive(mData.quizStatus === 'Active');
        setAllowReview(!!mData.allowReviewAfterClose);
      }

      if (subsRes.ok) {
        const sData = await subsRes.json();
        const apiSubs = sData.submissions || [];
        mergeSubmissions(apiSubs);
      }

      if (logsRes.ok) {
        const lData = await logsRes.json();
        setAuditLogs(lData.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to merge and deduplicate submissions by submissionId or rollNumber
  const mergeSubmissions = (newItems: any[]) => {
    setSubmissions(prev => {
      const map = new Map<string, any>();
      // Keep existing items
      for (const item of prev) {
        const key = item.submissionId || `${item.rollNumber}_${item.sessionId || 'session_1'}`;
        map.set(key, item);
      }
      // Add or update with new items
      for (const item of newItems) {
        const key = item.submissionId || `${item.rollNumber}_${item.sessionId || 'session_1'}`;
        map.set(key, item);
      }
      return Array.from(map.values());
    });
  };

  // Real-time Firestore listener: captures student submissions from all devices live!
  useEffect(() => {
    fetchAdminData();

    let unsubscribe: (() => void) | undefined;
    try {
      const q = collection(db, 'quizResults');
      unsubscribe = onSnapshot(
        q,
        snapshot => {
          const liveList: any[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            liveList.push({
              rollNumber: data.rollNumber,
              fullName: data.fullName,
              email: data.email,
              status: 'submitted',
              score: data.score,
              totalMarks: data.totalMarks || 30,
              percentage: data.percentage,
              timeTakenSeconds: data.timeTakenSeconds,
              submittedAt: data.submittedAt,
              submissionId: data.submissionId || docSnap.id,
              sessionId: data.sessionId || 'session_1',
              attemptId: data.attemptId || null,
            });
          });
          if (liveList.length > 0) {
            mergeSubmissions(liveList);
          }
        },
        error => {
          console.warn('Real-time Firestore listener notice (will use REST sync):', error.message);
        }
      );
    } catch (err) {
      console.warn('Firestore subscription setup notice:', err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [adminEmail]);

  // Restart Quiz Session Handler
  const handleExecuteRestart = async () => {
    setIsRestarting(true);
    setRestartErrorMsg(null);
    setRestartSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/restart-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
          'x-admin-key': 'quizzora_admin_2026',
        },
        body: JSON.stringify({
          adminEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRestartErrorMsg(data.error || 'Failed to restart session.');
        setIsRestarting(false);
        return;
      }

      setRestartSuccessMsg(data.message || 'Competition successfully restarted into a new session!');
      setShowRestartModal(false);
      await fetchAdminData();
      setTimeout(() => setRestartSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Restart session error:', err);
      setRestartErrorMsg('Network error while requesting session restart.');
    } finally {
      setIsRestarting(false);
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
          'x-admin-key': 'quizzora_admin_2026',
        },
        body: JSON.stringify({
          accessCode: newAccessCode,
          isActive: isQuizActive,
          allowReviewAfterClose: allowReview,
          adminEmail,
        }),
      });

      if (res.ok) {
        setSettingsSuccessMsg('Quiz settings and access code updated successfully in Firestore!');
        fetchAdminData();
        setTimeout(() => setSettingsSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  // Reset Student Attempt
  const handleResetAttempt = async (rollNumber: string) => {
    if (!window.confirm(`Reset attempt for Roll Number ${rollNumber}? This will permit the student to retake the current session.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
          'x-admin-key': 'quizzora_admin_2026',
        },
        body: JSON.stringify({
          rollNumber,
          adminEmail,
        }),
      });

      if (res.ok) {
        alert(`Attempt for ${rollNumber} has been reset.`);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error resetting attempt:', err);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    window.location.href = '/api/admin/export-csv';
  };

  // Distinct Sessions list
  const availableSessions = Array.from(new Set(submissions.map(s => s.sessionId || 'session_1')));

  // Filtered & Sorted Submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch =
      (s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSession = sessionFilter === 'all' || (s.sessionId || 'session_1') === sessionFilter;

    return matchesSearch && matchesStatus && matchesSession;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) aVal = -1;
    if (bVal === null || bVal === undefined) bVal = -1;

    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const totalPages = Math.max(1, Math.ceil(sortedSubmissions.length / itemsPerPage));
  const paginatedSubmissions = sortedSubmissions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="py-6 space-y-8 max-w-7xl mx-auto px-2 sm:px-0">
      {/* Top Banner & Action Controls */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Organizer Control Center</h1>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Firestore Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <span className="font-mono text-purple-300">{adminEmail}</span>
            </p>
          </div>
        </div>

        {/* Global Toolbar Buttons including RESTART BUTTON */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* RESTART QUIZ SESSION BUTTON */}
          <button
            onClick={() => setShowRestartModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
            title="Restart quiz into a new session while preserving all previous marks"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart Quiz Session</span>
          </button>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Restart Feedback Banner */}
      {restartSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>✓ {restartSuccessMsg}</span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
            Submissions
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {submissions.filter(s => s.status === 'submitted').length}
          </p>
          <span className="text-3xs text-slate-500">Firestore Stored</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider block">
            Active Session
          </span>
          <p className="text-sm font-bold font-mono text-blue-600 mt-2 truncate">
            {metrics?.currentSessionId || 'session_1'}
          </p>
          <span className="text-3xs text-slate-500">Session #{metrics?.sessionNumber || 1}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-purple-500 uppercase tracking-wider block">
            Average Score
          </span>
          <p className="text-2xl font-bold font-mono text-purple-600 mt-1">
            {metrics?.averageScore ?? 0} <span className="text-xs text-slate-400">/30</span>
          </p>
          <span className="text-3xs text-slate-500">Cohort Average</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-indigo-500 uppercase tracking-wider block">
            Top Score
          </span>
          <p className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {metrics?.highestScore ?? 0} <span className="text-xs text-slate-400">/30</span>
          </p>
          <span className="text-3xs text-slate-500">Highest Achieved</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-amber-500 uppercase tracking-wider block">
            Access Code
          </span>
          <p className="text-base font-bold font-mono text-slate-900 mt-1.5 truncate">
            {metrics?.accessCode || 'QUIZZORA2026'}
          </p>
          <span className="text-3xs text-slate-500">Active Code</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-emerald-500 uppercase tracking-wider block">
            Quiz Status
          </span>
          <p className="text-base font-bold text-emerald-600 mt-1.5">
            {metrics?.quizStatus || 'Active'}
          </p>
          <span className="text-3xs text-slate-500">Competition Open</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'submissions'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Student Submissions ({submissions.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Quiz Controls & Access Key
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'questions'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Official 30 Questions & Keys
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'audit'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Log
        </button>
      </div>

      {/* Tab 1: Student Submissions Table */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, roll no, email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Session Filter */}
              <select
                value={sessionFilter}
                onChange={e => setSessionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Sessions</option>
                {availableSessions.map(sess => (
                  <option key={sess} value={sess}>
                    {sess === metrics?.currentSessionId ? `Current (${sess})` : sess}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>

            <div className="text-2xs text-slate-500 font-medium">
              Showing {paginatedSubmissions.length} of {filteredSubmissions.length} records
            </div>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortField('rollNumber');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Roll Number</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortField('fullName');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Full Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Session</th>
                  <th className="p-3.5">Status</th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSortField('score');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Score (/30)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3.5">Percentage</th>
                  <th className="p-3.5">Time Spent</th>
                  <th className="p-3.5">Submitted At</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No matching student submissions found in Firestore.
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map(sub => {
                    const isCurrentSession = sub.sessionId === metrics?.currentSessionId;

                    return (
                      <tr key={sub.submissionId || sub.rollNumber} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-900">
                          {sub.rollNumber}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-900">{sub.fullName}</td>
                        <td className="p-3.5 text-slate-500 font-mono text-2xs">{sub.email}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-3xs font-semibold ${
                            isCurrentSession ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {sub.sessionId || 'session_1'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {sub.status === 'submitted' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Submitted
                            </span>
                          )}
                          {sub.status === 'in_progress' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                              In Progress
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {sub.score !== null ? (
                            <span className="text-sm text-blue-700">{sub.score} / 30</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono">
                          {sub.percentage !== null ? `${sub.percentage}%` : '—'}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {sub.timeTakenSeconds
                            ? `${Math.floor(sub.timeTakenSeconds / 60)}m ${sub.timeTakenSeconds % 60}s`
                            : '—'}
                        </td>
                        <td className="p-3.5 text-slate-500 text-3xs">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleResetAttempt(sub.rollNumber)}
                            title="Reset attempt for this student in current session"
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 text-2xs font-semibold cursor-pointer"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-2 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Settings & Controls */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Key className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Quiz Operational Controls</h2>
              <p className="text-xs text-slate-500">
                Modify access code, open/close the competition, and control review access
              </p>
            </div>
          </div>

          {settingsSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              ✓ {settingsSuccessMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Access Code */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active Quiz Access Code
              </label>
              <input
                type="text"
                required
                value={newAccessCode}
                onChange={e => setNewAccessCode(e.target.value.toUpperCase())}
                placeholder="e.g. QUIZZORA2026"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono uppercase text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <p className="text-2xs text-slate-500">
                Configured access code is verified securely on the backend.
              </p>
            </div>

            {/* Quiz Open/Close Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-sm text-slate-900 block">Competition Status</strong>
                <span className="text-xs text-slate-500">
                  {isQuizActive
                    ? 'Quiz is open: eligible students can enter and take the test.'
                    : 'Quiz is closed: access is locked for all participants.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuizActive(!isQuizActive)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isQuizActive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                {isQuizActive ? 'Open / Active' : 'Closed'}
              </button>
            </div>

            {/* Allow Review Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-sm text-slate-900 block">
                  Allow Answer Review After Closure
                </strong>
                <span className="text-xs text-slate-500">
                  When enabled, students can see question explanations on their scorecard after the competition closes.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAllowReview(!allowReview)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  allowReview ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {allowReview ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Save Configuration Changes
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Questions & Answer Key */}
      {activeTab === 'questions' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Official Master Question Bank (30 MCQs)
            </h2>
            <p className="text-xs text-slate-500">
              Private answer key and technical explanations. Never exposed to active student sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MASTER_QUESTIONS.map(q => (
              <div key={q.id} className="p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-900">
                  <span>Question {q.order}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                    Key: {q.correctOption}
                  </span>
                </div>

                <p className="font-semibold text-slate-800">{q.questionText}</p>

                {q.codeSnippet && (
                  <pre className="p-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-2xs overflow-x-auto">
                    {q.codeSnippet}
                  </pre>
                )}

                <div className="grid grid-cols-2 gap-1 text-2xs text-slate-600 pt-1">
                  {q.options.map(opt => (
                    <div
                      key={opt.key}
                      className={`p-1.5 rounded-md ${
                        opt.key === q.correctOption
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                          : 'bg-slate-50'
                      }`}
                    >
                      <strong>{opt.key}:</strong> {opt.text}
                    </div>
                  ))}
                </div>

                <p className="text-3xs text-slate-500 italic pt-1 border-t border-slate-100">
                  {q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Administrative Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Immutable log of configuration updates, attempt resets, and session restarts
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.map(log => (
              <div key={log.logId} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <span className="font-mono text-2xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {log.action}
                  </span>
                  <p className="text-slate-700 mt-1">{log.details}</p>
                  <p className="text-3xs text-slate-400 font-mono mt-0.5">By {log.adminEmail}</p>
                </div>
                <span className="text-3xs text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR RESTART QUIZ SESSION */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Restart Quiz Competition Session?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This operation will archive the current active session (<strong className="font-mono">{metrics?.currentSessionId || 'session_1'}</strong>) and launch a brand new quiz session with a fresh 30-minute timer for incoming student attempts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Data Preservation Guarantee</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-2xs text-amber-800">
                <li>All previously submitted student marks, scores, and receipts remain safe in Cloud Firestore.</li>
                <li>Past submissions are preserved and searchable in the results table.</li>
                <li>New student logins will participate under the new session.</li>
              </ul>
            </div>

            {restartErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {restartErrorMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRestartModal(false);
                  setRestartErrorMsg(null);
                }}
                disabled={isRestarting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancel (Keep Current)
              </button>

              <button
                type="button"
                onClick={handleExecuteRestart}
                disabled={isRestarting}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restarting...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Yes, Restart Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
