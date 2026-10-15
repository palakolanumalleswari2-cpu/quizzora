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
  Key,
  ToggleLeft,
  ToggleRight,
  Shield,
  FileSpreadsheet,
  Layers,
  History,
  Eye,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BookOpen,
  Code2,
} from 'lucide-react';
import { MASTER_QUESTIONS } from '../data/quizQuestions.js';

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
  const [sortField, setSortField] = useState<'score' | 'rollNumber' | 'fullName' | 'submittedAt'>('submittedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Settings State
  const [newAccessCode, setNewAccessCode] = useState('');
  const [isQuizActive, setIsQuizActive] = useState(true);
  const [allowReview, setAllowReview] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Selected Submission Modal
  const [selectedSub, setSelectedSub] = useState<any | null>(null);

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
        setSubmissions(sData.submissions || []);
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

  useEffect(() => {
    fetchAdminData();
  }, [adminEmail]);

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
        setSettingsSuccessMsg('Quiz settings and access code updated successfully!');
        fetchAdminData();
        setTimeout(() => setSettingsSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  // Reset Student Attempt
  const handleResetAttempt = async (rollNumber: string) => {
    if (!window.confirm(`Are you sure you want to reset the attempt for Roll No ${rollNumber}? This will wipe their current score and permit them to retake the quiz.`)) {
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

  // Filtered & Sorted Submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    <div className="py-6 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Organizer Control Center</h1>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Live Console
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <span className="font-mono text-purple-300">{adminEmail}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
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

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
            Registered
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {metrics?.registeredCount ?? 0}
          </p>
          <span className="text-3xs text-slate-500">Total Participants</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-blue-500 uppercase tracking-wider block">
            In Progress
          </span>
          <p className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {metrics?.inProgressCount ?? 0}
          </p>
          <span className="text-3xs text-slate-500">Currently Taking</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-emerald-500 uppercase tracking-wider block">
            Submitted
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {metrics?.submittedCount ?? 0}
          </p>
          <span className="text-3xs text-slate-500">Completed Attempts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-2xs font-bold text-amber-500 uppercase tracking-wider block">
            Not Started
          </span>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {metrics?.notStartedCount ?? 0}
          </p>
          <span className="text-3xs text-slate-500">Registered only</span>
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'submissions'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Student Submissions ({submissions.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Quiz Controls & Access Key
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'questions'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Official 30 Questions & Keys
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Log
        </button>
      </div>

      {/* Tab 1: Submissions Table */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-6">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, roll number, email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="in_progress">In Progress</option>
                <option value="not_started">Not Started</option>
              </select>
            </div>

            <div className="text-2xs text-slate-500 font-medium">
              Showing {paginatedSubmissions.length} of {filteredSubmissions.length} participants
            </div>
          </div>

          {/* Table */}
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
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No matching student participants found.
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map(sub => {
                    return (
                      <tr key={sub.rollNumber} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-900">
                          {sub.rollNumber}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-900">{sub.fullName}</td>
                        <td className="p-3.5 text-slate-500 font-mono text-2xs">{sub.email}</td>
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
                          {sub.status === 'not_started' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              Registered
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
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleResetAttempt(sub.rollNumber)}
                            title="Reset Attempt (Permits retake)"
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 text-2xs font-semibold cursor-pointer"
                          >
                            Reset Attempt
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
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
                All participants must provide this code to enter the examination. Changes take effect instantly on the backend.
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

      {/* Tab 3: Questions & Answer Key (Organizer Privileged View) */}
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
              Immutable log of configuration updates, attempt resets, and organizer actions
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
    </div>
  );
};
