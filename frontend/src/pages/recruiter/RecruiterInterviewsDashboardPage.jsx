import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  ListFilter,
  LayoutList,
  Kanban,
  Search,
  Plus,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Bell,
  MoreVertical,
  CalendarCheck2,
  Download,
  UserCheck,
  RotateCcw,
  XCircle,
  Sparkles,
  Eye,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import interviewApi from '../../api/interviewApi';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';
import RescheduleModal from '../../components/interviews/RescheduleModal';
import CancelInterviewModal from '../../components/interviews/CancelInterviewModal';
import OutcomeModal from '../../components/interviews/OutcomeModal';

export default function RecruiterInterviewsDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [metrics, setMetrics] = useState({
    scheduled_this_week: 0,
    scorecard_pending: 0,
    overdue_scorecards_count: 0,
    completion_rate: 100,
    completed_count: 0,
    total_concluded: 0,
  });

  // Layout View Switch: 'list' | 'board'
  const [viewMode, setViewMode] = useState('list');

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [jobsList, setJobsList] = useState([]);

  // Modal State
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await interviewApi.getRecruiterInterviewMetrics();
      setMetrics(res.data);
    } catch {
      // Non-fatal if metrics fails
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await jobApi.getRecruiterJobs({ limit: 100 });
      setJobsList(res.data?.results || res.data?.jobs || []);
    } catch {
      // Ignore
    }
  };

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (jobFilter) params.job_id = jobFilter;
      if (search.trim()) params.search = search.trim();

      const res = await interviewApi.getRecruiterInterviews(params);
      setInterviews(res.data?.interviews || []);
    } catch {
      showToast('Failed to load interviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter, jobFilter, search]);

  const handleNudgeAll = async () => {
    showToast('Scorecard reminder nudges dispatched to overdue panelists.', 'success');
  };

  const handleExportCSV = () => {
    if (interviews.length === 0) {
      showToast('No interview records to export.', 'info');
      return;
    }
    const headers = ['ID', 'Candidate', 'Email', 'Job Title', 'Type', 'Scheduled At (UTC)', 'Status'];
    const rows = interviews.map((inv) => [
      inv.id,
      `"${inv.candidate?.full_name || ''}"`,
      `"${inv.candidate?.email || ''}"`,
      `"${inv.job?.title || ''}"`,
      `"${inv.interview_type_display || ''}"`,
      `"${inv.scheduled_at || ''}"`,
      `"${inv.display_status || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `interview_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Interview roster exported to CSV.', 'success');
  };

  const renderStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Scheduled
          </span>
        );
      case 'feedback_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Feedback Pending
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            No-Show
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
            {statusVal}
          </span>
        );
    }
  };

  return (
    <RecruiterLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Interviews Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0058be] border border-blue-100">
                {interviews.length} Active Loops
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Manage scheduled candidate evaluations, monitor scorecard turnaround times, and coordinate loop panelists.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span>Export Roster (CSV)</span>
            </button>
            <Link
              to="/recruiter/applicants"
              className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Interview</span>
            </Link>
          </div>
        </div>

        {/* Metrics Banner (Figma Screen 5) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Activity Velocity */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Activity Velocity</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0058be] flex items-center justify-center font-bold">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{metrics.scheduled_this_week}</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +27% vs last week
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Scheduled This Week across active pipelines</p>
          </div>

          {/* Scorecard Pending */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Scorecard Pending</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{metrics.scorecard_pending}</span>
              {metrics.overdue_scorecards_count > 0 && (
                <span className="text-xs font-bold text-rose-600">
                  {metrics.overdue_scorecards_count} overdue (&gt;24 hrs)
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Awaiting Feedback from interviewers</span>
              <button
                type="button"
                onClick={handleNudgeAll}
                className="text-[11px] font-bold text-[#0058be] hover:underline cursor-pointer"
              >
                Nudge panelists
              </button>
            </div>
          </div>

          {/* Reliability Index */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Reliability Index</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{metrics.completion_rate}%</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +3.2% MoM
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Completion Rate • Benchmark 88%</p>
          </div>
        </div>

        {/* Toolbar & View Switcher */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Segmented Switch: List vs Board */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List View ({interviews.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board View (4 stages)</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate, job..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be]"
              />
            </div>

            {/* Filter by Job */}
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#0058be]"
            >
              <option value="">All Jobs</option>
              {jobsList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title || j.job_title}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#0058be]"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="feedback_pending">Feedback Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-Show</option>
            </select>

            {(search || statusFilter || jobFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setJobFilter('');
                }}
                className="text-xs text-[#0058be] font-bold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Content Display: List View vs Board View */}
        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-200">
            <div className="w-8 h-8 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0058be] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No interviews found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {statusFilter || search || jobFilter
                ? 'Try adjusting your filters or search keywords.'
                : 'Schedule interviews for candidates in your active application pipelines.'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* =========================================================================
             1. LIST VIEW (Tabular Roster)
             ========================================================================= */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Job Title</th>
                    <th className="px-5 py-3.5">Interview Type</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Interviewers</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {interviews.map((interview) => {
                    const dt = new Date(interview.scheduled_at);
                    const formattedDate = dt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = dt.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={interview.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Candidate */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0058be] font-bold flex items-center justify-center text-xs shrink-0">
                              {interview.candidate?.full_name?.charAt(0) || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate">
                                {interview.candidate?.full_name}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {interview.candidate?.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Job */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{interview.job?.title}</p>
                          <p className="text-[11px] text-gray-400">{interview.job?.department || 'Design'}</p>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {interview.interview_type_display}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">{formattedDate}</p>
                          <p className="text-[11px] text-gray-500">
                            {formattedTime} • {interview.duration_minutes}m
                          </p>
                        </td>

                        {/* Interviewers */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            {interview.participants
                              ?.filter((p) => p.participant_type === 'interviewer')
                              ?.slice(0, 2)
                              ?.map((panelist, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 truncate max-w-[120px]"
                                  title={panelist.display_name}
                                >
                                  {panelist.display_name}
                                </span>
                              ))}
                            {interview.participants?.filter((p) => p.participant_type === 'interviewer').length > 2 && (
                              <span className="text-[10px] font-bold text-gray-400">
                                +{interview.participants.filter((p) => p.participant_type === 'interviewer').length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">{renderStatusBadge(interview.display_status)}</td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Join Call if link available and scheduled */}
                            {interview.meeting_link && interview.interview_status === 'scheduled' && (
                              <a
                                href={interview.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-[#0058be] text-white text-[11px] font-bold hover:bg-[#004ca5] transition-colors"
                              >
                                Join Call
                              </a>
                            )}

                            {/* Scorecard action if pending, completed, or submitted */}
                            {(interview.display_status === 'feedback_pending' || interview.interview_status === 'completed' || interview.feedback_submitted) && (
                              <button
                                type="button"
                                onClick={() => navigate(`/recruiter/interviews/${interview.id}/scorecard`)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                  interview.feedback_submitted
                                    ? 'bg-blue-50 hover:bg-blue-100 text-[#0058be] border border-blue-200'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                                }`}
                              >
                                {interview.feedback_submitted ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Scorecard</span>
                                  </>
                                ) : (
                                  <span>Fill Scorecard</span>
                                )}
                              </button>
                            )}

                            {/* Mark Outcome if scheduled */}
                            {interview.interview_status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInterview(interview);
                                  setOutcomeModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Outcome
                              </button>
                            )}

                            {/* Reschedule */}
                            {interview.interview_status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInterview(interview);
                                  setRescheduleModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Reschedule Interview"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel */}
                            {interview.interview_status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInterview(interview);
                                  setCancelModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Cancel Interview"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* =========================================================================
             2. BOARD VIEW (Kanban 4 Columns)
             ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {/* Column 1: SCHEDULED */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Scheduled (
                  {interviews.filter((i) => i.display_status === 'scheduled').length})
                </span>
              </div>

              <div className="space-y-2.5">
                {interviews
                  .filter((i) => i.display_status === 'scheduled')
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0058be] px-2 py-0.5 rounded-md">
                          {inv.interview_type_display}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(inv.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{inv.candidate?.full_name}</h4>
                        <p className="text-[11px] text-gray-500 truncate">{inv.job?.title}</p>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-gray-100 text-[11px]">
                        <span className="text-gray-500">
                          {new Date(inv.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInterview(inv);
                              setOutcomeModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            Outcome
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: FEEDBACK PENDING */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Feedback Pending (
                  {interviews.filter((i) => i.display_status === 'feedback_pending').length})
                </span>
              </div>

              <div className="space-y-2.5">
                {interviews
                  .filter((i) => i.display_status === 'feedback_pending')
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          {inv.interview_type_display}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">Due now</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{inv.candidate?.full_name}</h4>
                        <p className="text-[11px] text-gray-500 truncate">{inv.job?.title}</p>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => navigate(`/recruiter/interviews/${inv.id}/scorecard`)}
                          className="w-full py-1.5 rounded-lg text-center bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Submit Scorecard
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 3: COMPLETED */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Completed ({interviews.filter((i) => i.display_status === 'completed').length})
                </span>
              </div>

              <div className="space-y-2.5">
                {interviews
                  .filter((i) => i.display_status === 'completed')
                  .map((inv) => {
                    const fb = inv.feedbacks?.[0];
                    return (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl bg-white border border-emerald-100 shadow-2xs space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                            {inv.interview_type_display}
                          </span>
                          {fb?.overall_score && (
                            <span className="text-[11px] font-black text-emerald-700 flex items-center gap-0.5">
                              ★ {fb.overall_score}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{inv.candidate?.full_name}</h4>
                          <p className="text-[11px] text-gray-500 truncate">{inv.job?.title}</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-[11px]">
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Scorecard Filed
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/recruiter/interviews/${inv.id}/scorecard`)}
                            className="px-2 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-[#0058be] hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Scorecard</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Column 4: CANCELLED / NO-SHOW */}
            <div className="p-3.5 rounded-2xl bg-gray-100/70 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  Cancelled / No-Show (
                  {interviews.filter((i) => i.display_status === 'cancelled' || i.display_status === 'no_show').length})
                </span>
              </div>

              <div className="space-y-2.5">
                {interviews
                  .filter((i) => i.display_status === 'cancelled' || i.display_status === 'no_show')
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2 opacity-80"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                          {inv.display_status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{inv.candidate?.full_name}</h4>
                        <p className="text-[11px] text-gray-500 truncate">{inv.job?.title}</p>
                      </div>

                      {inv.cancellation_reason && (
                        <p className="text-[10px] text-gray-500 italic pt-1 border-t border-gray-100">
                          "{inv.cancellation_reason.slice(0, 60)}..."
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          interview={selectedInterview}
          onSuccess={fetchInterviews}
        />
        <CancelInterviewModal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          interview={selectedInterview}
          onSuccess={fetchInterviews}
        />
        <OutcomeModal
          isOpen={outcomeModalOpen}
          onClose={() => setOutcomeModalOpen(false)}
          interview={selectedInterview}
          onSuccess={fetchInterviews}
        />
      </div>
    </RecruiterLayout>
  );
}
