import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  PauseCircle,
  PlayCircle,
  XCircle,
  CheckCircle,
  Clock,
  Users,
  AlertCircle,
  Loader2,
  Building2,
  Check,
  Send,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import Pagination from '../../components/common/Pagination';
import jobApi from '../../api/jobApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';

export default function RecruiterJobPostingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState([]);

  // Data
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({
    total_jobs: 0,
    active_jobs: 0,
    draft_jobs: 0,
    on_hold_jobs: 0,
    closed_jobs: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Actions Dropdown Menu state
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Fetch departments
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await masterDataApi.getCategoryItems('department');
        setDepartments(res.data?.results || res.data || []);
      } catch (err) {}
    }
    loadDepts();
  }, []);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 10,
      };
      if (activeTab !== 'all') params.status = activeTab;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedDept) params.department = selectedDept;

      const res = await jobApi.getRecruiterJobs(params);
      setJobs(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
      setCurrentPage(page);
    } catch (err) {
      showToast('Unable to load job postings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedDept, showToast]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'all' ? {} : { status: tab });
  };

  // Status transitions
  const handlePublishDraft = async (jobId) => {
    try {
      await jobApi.publishJob(jobId);
      showToast('Job successfully published and live!', 'success');
      fetchJobs(currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot publish. Please complete missing fields.';
      showToast(msg, 'error');
    }
  };

  const handleHoldJob = async (jobId) => {
    try {
      await jobApi.holdJob(jobId, { reason: 'Temporarily paused by recruiter.' });
      showToast('Job placed on hold.', 'success');
      fetchJobs(currentPage);
    } catch (err) {
      showToast('Failed to pause job.', 'error');
    } finally {
      setActionMenuOpenId(null);
    }
  };

  const handleResumeJob = async (jobId) => {
    try {
      await jobApi.resumeJob(jobId);
      showToast('Job resumed to active status.', 'success');
      fetchJobs(currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resume job.';
      showToast(msg, 'error');
    } finally {
      setActionMenuOpenId(null);
    }
  };

  const handleCloseJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to close this job posting? Candidates will no longer be able to discover it.')) {
      return;
    }
    try {
      await jobApi.closeJob(jobId);
      showToast('Job closed.', 'success');
      fetchJobs(currentPage);
    } catch (err) {
      showToast('Failed to close job.', 'error');
    } finally {
      setActionMenuOpenId(null);
    }
  };

  const handleDeleteDraft = async (jobId) => {
    if (!window.confirm('Are you sure you want to permanently delete this draft? This cannot be undone.')) {
      return;
    }
    try {
      await jobApi.deleteJob(jobId);
      showToast('Draft deleted successfully.', 'success');
      fetchJobs(currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete draft.';
      showToast(msg, 'error');
    } finally {
      setActionMenuOpenId(null);
    }
  };

  const isDraftTab = activeTab === 'draft';

  return (
    <RecruiterLayout>
      <div className="space-y-6">
        {/* Header (Figma Page 9) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0e3e5]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#71787e] mb-1">
              Recruiter Portal / Job Postings
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
              Job Postings
            </h1>
            <p className="text-sm text-[#41474d] mt-0.5">
              Manage active listings, review draft completeness, and monitor applicant pipelines.
            </p>
          </div>

          <Link
            to="/recruiter/jobs/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Post New Job</span>
          </Link>
        </div>

        {/* Top Summary Metric Cards (Figma Page 8 & 9) */}
        {isDraftTab ? (
          /* Drafts Specific Metrics (Figma Page 8) */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                  Ready to Publish
                </span>
                <div className="text-2xl font-black text-[#137333] mt-1">
                  {jobs.filter((j) => j.completion_score === 100).length} Jobs
                </div>
                <div className="text-[11px] text-[#71787e] mt-0.5">
                  100% complete — pending recruiter signoff
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                  Incomplete Drafts
                </span>
                <div className="text-2xl font-black text-[#b06000] mt-1">
                  {jobs.filter((j) => (j.completion_score || 0) < 100).length} Jobs
                </div>
                <div className="text-[11px] text-[#71787e] mt-0.5">
                  Missing required fields or skills
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#fff8e1] text-[#b06000] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                  Avg Readiness
                </span>
                <div className="text-2xl font-black text-[#0058be] mt-1">
                  {jobs.length > 0
                    ? Math.round(
                        jobs.reduce((acc, j) => acc + (j.completion_score || 0), 0) / jobs.length
                      )
                    : 0}
                  %
                </div>
                <div className="text-[11px] text-[#71787e] mt-0.5">
                  Across all active drafts in progress
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
        ) : (
          /* General Job Metrics (Figma Page 9) */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">Active Jobs</span>
              <div className="text-2xl font-black text-[#191c1e] mt-1">{summary.active_jobs}</div>
              <div className="text-[11px] text-[#137333] font-medium mt-0.5">Live on TalentBridge</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">Draft Jobs</span>
              <div className="text-2xl font-black text-[#191c1e] mt-1">{summary.draft_jobs}</div>
              <div className="text-[11px] text-[#b06000] font-medium mt-0.5">In progress</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">On Hold</span>
              <div className="text-2xl font-black text-[#191c1e] mt-1">{summary.on_hold_jobs}</div>
              <div className="text-[11px] text-[#71787e] font-medium mt-0.5">Temporarily paused</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#71787e]">Closed Jobs</span>
              <div className="text-2xl font-black text-[#191c1e] mt-1">{summary.closed_jobs}</div>
              <div className="text-[11px] text-[#71787e] font-medium mt-0.5">Filled or archived</div>
            </div>
          </div>
        )}

        {/* Tab Navigation & Search Bar */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[#e0e3e5] overflow-x-auto pb-px">
            {[
              { id: 'all', label: `All Jobs (${summary.total_jobs})` },
              { id: 'active', label: `Active (${summary.active_jobs})` },
              { id: 'draft', label: `Draft Jobs (${summary.draft_jobs})` },
              { id: 'on_hold', label: `On Hold (${summary.on_hold_jobs})` },
              { id: 'closed', label: `Closed (${summary.closed_jobs})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-3 text-xs font-bold tracking-tight border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#0058be] text-[#0058be]'
                      : 'border-transparent text-[#71787e] hover:text-[#191c1e]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:max-w-md relative">
              <Search className="w-4 h-4 text-[#71787e] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs by title or keyword..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e] placeholder:text-[#71787e] focus:outline-hidden focus:border-[#0058be]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs font-semibold text-[#191c1e] focus:outline-hidden focus:border-[#0058be] cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.value}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#71787e]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
            <span className="text-sm font-medium">Loading listings...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#e0e3e5] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#191c1e]">No job postings in this view</h3>
            <p className="text-xs text-[#71787e] max-w-sm mx-auto">
              {isDraftTab
                ? 'You have no incomplete drafts saved.'
                : 'No job postings match your active filter criteria.'}
            </p>
            <Link
              to="/recruiter/jobs/new"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post a New Job</span>
            </Link>
          </div>
        ) : isDraftTab ? (
          /* Drafts Table View (Figma Page 8) */
          <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5] text-[#71787e] uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-4">Job Title & Details</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Last Edited</th>
                    <th className="py-3.5 px-4">Completion & Missing Items</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f6]">
                  {jobs.map((job) => {
                    const isReady = job.completion_score === 100;
                    return (
                      <tr key={job.id} className="hover:bg-[#f7f9fb]/60 transition-colors">
                        <td className="py-4 px-4 font-semibold text-[#191c1e]">
                          <div className="font-bold text-sm text-[#191c1e]">{job.job_title}</div>
                          <div className="text-[11px] text-[#71787e] mt-0.5">
                            {job.location || 'Location not set'} • {job.openings} opening(s)
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#41474d] font-medium">
                          {job.department_name || '—'}
                        </td>

                        <td className="py-4 px-4 text-[#71787e]">
                          {new Date(job.updated_at).toLocaleDateString()}
                        </td>

                        {/* Readiness & Missing items */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5 max-w-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={`font-bold ${isReady ? 'text-[#137333]' : 'text-[#b06000]'}`}>
                                {job.completion_score}% {isReady ? 'Ready' : 'Incomplete'}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#e0e3e5] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isReady ? 'bg-[#137333]' : 'bg-[#b06000]'
                                }`}
                                style={{ width: `${job.completion_score || 0}%` }}
                              />
                            </div>
                            {job.missing_fields?.length > 0 && (
                              <div className="text-[10px] text-[#ba1a1a] line-clamp-1">
                                Missing: {job.missing_fields.slice(0, 3).join(', ')}
                                {job.missing_fields.length > 3 && ` +${job.missing_fields.length - 3} more`}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isReady && (
                              <button
                                type="button"
                                onClick={() => handlePublishDraft(job.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Publish</span>
                              </button>
                            )}

                            <Link
                              to={`/recruiter/jobs/${job.id}/edit`}
                              className="px-3 py-1.5 rounded-lg border border-[#c1c7ce] text-xs font-semibold text-[#41474d] hover:bg-white hover:text-[#0058be] transition-colors inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit Draft</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(job.id)}
                              className="p-1.5 text-[#71787e] hover:text-[#ba1a1a] rounded-lg transition-colors cursor-pointer"
                              title="Delete draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
          /* Active / All Jobs Table View (Figma Page 9) */
          <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5] text-[#71787e] uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-4">Job Title</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Applicants</th>
                    <th className="py-3.5 px-4">Date Posted</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f6]">
                  {jobs.map((job) => {
                    const statusStyles = {
                      published: 'bg-[#e6f4ea] text-[#137333]',
                      draft: 'bg-[#fff8e1] text-[#b06000]',
                      on_hold: 'bg-[#f1f4f6] text-[#71787e]',
                      closed: 'bg-[#fce8e6] text-[#c5221f]',
                    }[job.job_status] || 'bg-[#f1f4f6] text-[#71787e]';

                    const isMenuOpen = actionMenuOpenId === job.id;

                    return (
                      <tr key={job.id} className="hover:bg-[#f7f9fb]/60 transition-colors">
                        <td className="py-4 px-4 font-semibold text-[#191c1e]">
                          <Link
                            to={`/recruiter/jobs/${job.id}/overview`}
                            className="font-bold text-sm text-[#191c1e] hover:text-[#0058be] transition-colors"
                          >
                            {job.job_title}
                          </Link>
                          <div className="text-[11px] text-[#71787e] mt-0.5">
                            {job.location || 'Remote'} • {job.employment_type?.replace('_', ' ')}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#41474d] font-medium">
                          {job.department_name || '—'}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles}`}>
                            {job.job_status === 'published' ? 'Active' : job.job_status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-[#0058be]">
                          {job.applications_count || 0}
                        </td>

                        <td className="py-4 px-4 text-[#71787e]">
                          {job.published_at
                            ? new Date(job.published_at).toLocaleDateString()
                            : new Date(job.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions Dropdown */}
                        <td className="py-4 px-4 text-right relative">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/recruiter/jobs/${job.id}/overview`}
                              className="p-1.5 rounded-lg text-[#71787e] hover:text-[#0058be] hover:bg-[#e8f0fe] transition-colors"
                              title="View Overview"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <Link
                              to={`/recruiter/jobs/${job.id}/edit`}
                              className="p-1.5 rounded-lg text-[#71787e] hover:text-[#0058be] hover:bg-[#e8f0fe] transition-colors"
                              title="Edit Job"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => setActionMenuOpenId(isMenuOpen ? null : job.id)}
                              className="p-1.5 rounded-lg text-[#71787e] hover:text-[#191c1e] hover:bg-[#f1f4f6] transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Kebab Menu Popup */}
                          {isMenuOpen && (
                            <div className="absolute right-4 top-12 z-30 w-44 bg-white border border-[#e0e3e5] rounded-2xl shadow-xl p-1.5 space-y-1 text-left">
                              {job.job_status === 'published' && (
                                <button
                                  type="button"
                                  onClick={() => handleHoldJob(job.id)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#41474d] hover:bg-[#f1f4f6] hover:text-[#191c1e] flex items-center gap-2 cursor-pointer"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Put on Hold</span>
                                </button>
                              )}

                              {job.job_status === 'on_hold' && (
                                <button
                                  type="button"
                                  onClick={() => handleResumeJob(job.id)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#137333] hover:bg-[#e6f4ea] flex items-center gap-2 cursor-pointer"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Resume Job</span>
                                </button>
                              )}

                              {job.job_status !== 'closed' && (
                                <button
                                  type="button"
                                  onClick={() => handleCloseJob(job.id)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#c5221f] hover:bg-[#fce8e6] flex items-center gap-2 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Close Listing</span>
                                </button>
                              )}

                              {job.job_status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDraft(job.id)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Draft</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 10 && (
          <div className="pt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={10}
              onPageChange={(p) => fetchJobs(p)}
            />
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
}

