import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users2,
  Search,
  Filter,
  Sparkles,
  Calendar,
  Briefcase,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import applicationApi from '../../api/applicationApi';
import jobApi from '../../api/jobApi';
import RejectionReasonModal from '../../components/recruiter/RejectionReasonModal';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function RecruiterAllApplicantsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [applicants, setApplicants] = useState([]);
  const [metrics, setMetrics] = useState({
    total_applicants: 0,
    new_today: 0,
    action_required: 0,
  });
  const [loading, setLoading] = useState(true);
  const [jobsList, setJobsList] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [minScore, setMinScore] = useState('');

  // Rejection modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedAppForReject, setSelectedAppForReject] = useState(null);

  useEffect(() => {
    fetchJobsFilterList();
  }, []);

  useEffect(() => {
    fetchApplicants();
  }, [selectedJobId, selectedStatus, minScore, searchQuery]);

  const fetchJobsFilterList = async () => {
    try {
      const res = await jobApi.getRecruiterJobs({ limit: 100 });
      setJobsList(res.data.results || []);
    } catch {
      // Ignore background error
    }
  };

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedJobId) params.job_id = selectedJobId;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (minScore) params.min_score = minScore;

      const res = await applicationApi.getRecruiterApplications(params);
      setApplicants(res.data.results || []);
      if (res.data.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch {
      // Ignore background load error
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!selectedAppForReject) return;
    try {
      await applicationApi.rejectApplication(selectedAppForReject.id, {
        rejection_reason: reason,
      });
      showToast('Candidate application rejected.', 'info');
      fetchApplicants();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject application.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'applied':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0058be] border border-blue-200">Applied</span>;
      case 'reviewing':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Reviewing</span>;
      case 'shortlisted':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Shortlisted</span>;
      case 'interview_scheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Interviewing</span>;
      case 'offer_sent':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Offer Sent</span>;
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Hired</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#ba1a1a] border border-rose-200">Rejected</span>;
      case 'withdrawn':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#71787e] border border-slate-200">Withdrawn</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#71787e]">{status}</span>;
    }
  };

  const getMatchScorePill = (score) => {
    if (score >= 85) {
      return (
        <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
          {score}% Match
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-blue-50 text-[#0058be] border border-blue-200">
          {score}% Match
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
          {score}% Match
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-slate-100 text-[#71787e] border border-slate-200">
        {score}% Match
      </span>
    );
  };

  return (
    <RecruiterLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header (Figma Page 6) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0e3e5]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">
              Applicant Pipeline
            </span>
            <h1 className="text-2xl font-black text-[#191c1e] tracking-tight mt-0.5">
              All Applicants
            </h1>
            <p className="text-xs text-[#71787e] mt-0.5">
              Manage and track candidate progress across all active requisitions.
            </p>
          </div>
        </div>

        {/* 3 Metric Cards (Figma Page 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
                Total Applicants
              </span>
              <div className="text-2xl font-black text-[#191c1e] mt-1">
                {metrics.total_applicants}
              </div>
              <p className="text-[11px] text-[#0058be] font-medium mt-0.5">
                Across all active job postings
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0058be] flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
                New Today
              </span>
              <div className="text-2xl font-black text-[#191c1e] mt-1">
                {metrics.new_today}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Received past 24 hours
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
                Action Required
              </span>
              <div className="text-2xl font-black text-[#ba1a1a] mt-1">
                {metrics.action_required}
              </div>
              <p className="text-[11px] text-[#71787e] font-medium mt-0.5">
                Pending initial resume review
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#ba1a1a] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar (Figma Page 6) */}
        <div className="bg-white p-4 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#71787e] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by name, email..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
              />
            </div>

            {/* Role / Job Dropdown */}
            <div>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white"
              >
                <option value="">All Job Roles</option>
                {jobsList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.job_title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied (New)</option>
                <option value="reviewing">In Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview_scheduled">Interviewing</option>
                <option value="offer_sent">Offer Sent</option>
                <option value="accepted">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Minimum ATS Match Score */}
            <div>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white font-semibold"
              >
                <option value="">All Match Scores</option>
                <option value="85">Strong Match (85%+)</option>
                <option value="70">Good Match (70%+)</option>
                <option value="50">Moderate Match (50%+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Applicants Table (Figma Page 6) */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#e0e3e5]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
            <p className="text-xs text-[#71787e]">Loading applicant directory...</p>
          </div>
        ) : applicants.length === 0 ? (
          <div className="p-16 bg-white rounded-3xl border border-[#e0e3e5] text-center space-y-3 shadow-xs">
            <Users2 className="w-10 h-10 text-[#71787e] mx-auto" />
            <h3 className="text-base font-bold text-[#191c1e]">No applicants match filters</h3>
            <p className="text-xs text-[#71787e]">
              Try adjusting your candidate search query, role filter, or minimum ATS score.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5] text-[#71787e] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-5">Candidate</th>
                    <th className="py-3.5 px-5">Applied Role</th>
                    <th className="py-3.5 px-5">Date Applied</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">ATS Match</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f6]">
                  {applicants.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/recruiter/applications/${app.id}`)}
                      className="hover:bg-[#f7f9fb] transition-colors cursor-pointer group"
                    >
                      {/* Candidate Name & Contact */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0058be]/10 text-[#0058be] font-bold flex items-center justify-center overflow-hidden shrink-0">
                            {app.candidate?.profile_picture_url ? (
                              <img
                                src={resolvePhotoUrl(app.candidate.profile_picture_url)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {app.candidate?.full_name?.charAt(0) || 'C'}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#191c1e] group-hover:text-[#0058be] transition-colors block">
                              {app.candidate?.full_name}
                            </span>
                            <span className="text-[11px] text-[#71787e]">
                              {app.candidate?.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Applied Role */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-[#191c1e] block">
                            {app.job?.job_title}
                          </span>
                          <span className="text-[10px] text-[#71787e] uppercase font-bold tracking-wider">
                            {app.job?.department || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Date Applied */}
                      <td className="py-4 px-5 text-[#41474d] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-[#71787e]" />
                          <span>{new Date(app.applied_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {getStatusBadge(app.application_status)}
                      </td>

                      {/* ATS Match Score */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {app.ats_match?.match_percentage !== undefined ? (
                          getMatchScorePill(app.ats_match.match_percentage)
                        ) : (
                          <span className="text-[#71787e]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/recruiter/applications/${app.id}`)}
                            className="px-3 py-1.5 rounded-lg border border-[#c1c7ce] text-[11px] font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors"
                          >
                            Review Dossier
                          </button>

                          {app.application_status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppForReject(app);
                                setRejectionModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-rose-50 transition-colors"
                              title="Reject Application"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      <RejectionReasonModal
        isOpen={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setSelectedAppForReject(null);
        }}
        candidateName={selectedAppForReject?.candidate?.full_name}
        onConfirm={handleConfirmReject}
      />
    </RecruiterLayout>
  );
}

