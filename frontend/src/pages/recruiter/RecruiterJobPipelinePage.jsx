import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Users2,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Plus,
  Loader2,
  LayoutGrid,
  List,
  Calendar,
  FileText,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import applicationApi from '../../api/applicationApi';
import RejectionReasonModal from '../../components/recruiter/RejectionReasonModal';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function RecruiterJobPipelinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [jobData, setJobData] = useState(null);
  const [stages, setStages] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'

  // Filtering on board
  const [searchQuery, setSearchQuery] = useState('');
  const [minAtsScore, setMinAtsScore] = useState('');

  // Rejection modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedAppForReject, setSelectedAppForReject] = useState(null);

  useEffect(() => {
    fetchPipelineData();
  }, [id]);

  const fetchPipelineData = async () => {
    setLoading(true);
    try {
      const res = await applicationApi.getRecruiterJobApplications(id);
      setJobData(res.data.job);
      setStages(res.data.stages || []);
      setApplications(res.data.applications || []);
    } catch (err) {
      showToast('Failed to load candidate pipeline.', 'error');
      navigate('/recruiter/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStageMove = async (applicationId, targetStageId) => {
    try {
      await applicationApi.moveApplicationStage(applicationId, {
        target_stage_id: targetStageId,
      });
      showToast('Candidate moved to new pipeline stage.', 'success');
      fetchPipelineData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update stage.', 'error');
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!selectedAppForReject) return;
    try {
      await applicationApi.rejectApplication(selectedAppForReject.id, {
        rejection_reason: reason,
      });
      showToast('Application rejected.', 'info');
      fetchPipelineData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject application.', 'error');
    }
  };

  // Filter applications by search and score
  const filteredApplications = applications.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (app.candidate?.full_name || '').toLowerCase();
      const email = (app.candidate?.email || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    if (minAtsScore) {
      const score = app.ats_match?.match_percentage || 0;
      if (score < parseInt(minAtsScore, 10)) return false;
    }
    return true;
  });

  const getMatchScorePill = (score) => {
    if (score >= 85) {
      return (
        <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
          {score}% Match
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-blue-50 text-[#0058be] border border-blue-200">
          {score}% Match
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-slate-100 text-[#71787e] border border-slate-200">
        {score}% Match
      </span>
    );
  };

  return (
    <RecruiterLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e0e3e5]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#71787e]">
            <Link
              to="/recruiter/jobs"
              className="hover:text-[#0058be] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Jobs</span>
            </Link>
            <span>/</span>
            <Link
              to={`/recruiter/jobs/${id}/overview`}
              className="hover:text-[#0058be] transition-colors"
            >
              {jobData?.title || 'Job Requisition'}
            </Link>
            <span>/</span>
            <span className="text-[#191c1e] font-bold">Pipeline Kanban</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/recruiter/jobs/${id}/overview`}
              className="px-3.5 py-1.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#0058be]" />
              <span>Job Overview</span>
            </Link>
            <Link
              to="/recruiter/applicants"
              className="px-3.5 py-1.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-1.5"
            >
              <Users2 className="w-3.5 h-3.5 text-[#0058be]" />
              <span>All Candidates Hub</span>
            </Link>
          </div>
        </div>

        {/* Pipeline Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">
                ATS Screening & Kanban Pipeline
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#191c1e] tracking-tight mt-0.5">
              {jobData?.title || 'Loading Pipeline...'}
            </h1>
            <p className="text-xs text-[#71787e] mt-0.5">
              {jobData?.department} • Total Candidates:{' '}
              <span className="font-bold text-[#191c1e]">{applications.length}</span>
            </p>
          </div>

          {/* Controls: Search, Match Filter & View Mode */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71787e] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white w-44 sm:w-56"
              />
            </div>

            {/* Min ATS Score Filter */}
            <select
              value={minAtsScore}
              onChange={(e) => setMinAtsScore(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] bg-white outline-none"
            >
              <option value="">All Match Scores</option>
              <option value="85">85%+ Match</option>
              <option value="70">70%+ Match</option>
              <option value="50">50%+ Match</option>
            </select>

            {/* View Switcher */}
            <div className="flex items-center bg-[#f1f4f6] p-1 rounded-xl border border-[#e0e3e5]">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white text-[#0058be] shadow-xs'
                    : 'text-[#71787e] hover:text-[#191c1e]'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0058be] shadow-xs'
                    : 'text-[#71787e] hover:text-[#191c1e]'
                }`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#e0e3e5]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
            <p className="text-xs text-[#71787e]">Loading recruitment pipeline...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ======================================================== */
          /* KANBAN BOARD VIEW */
          /* ======================================================== */
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-4 min-w-[1200px]">
              {stages.map((stage) => {
                // Find candidates in this stage
                const stageCandidates = filteredApplications.filter((app) => {
                  const currentStageId = app.current_stage?.id;
                  if (currentStageId) return currentStageId === stage.id;
                  // If no current stage assigned, fallback to first stage
                  return stage.order === 1;
                });

                return (
                  <div
                    key={stage.id}
                    className="flex-1 min-w-[280px] max-w-[340px] bg-[#f7f9fb] rounded-2xl border border-[#e0e3e5] flex flex-col max-h-[75vh]"
                  >
                    {/* Stage Column Header */}
                    <div className="p-4 border-b border-[#e0e3e5] bg-white rounded-t-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#0058be] text-[10px] font-extrabold flex items-center justify-center">
                          {stage.order}
                        </span>
                        <h3 className="font-bold text-xs text-[#191c1e] truncate">
                          {stage.name}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#f1f4f6] text-[11px] font-bold text-[#71787e]">
                        {stageCandidates.length}
                      </span>
                    </div>

                    {/* Candidate Cards Column */}
                    <div className="p-3 flex-1 overflow-y-auto space-y-3">
                      {stageCandidates.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-[#71787e] border border-dashed border-[#c1c7ce] rounded-xl bg-white/50">
                          No candidates in this stage
                        </div>
                      ) : (
                        stageCandidates.map((app) => (
                          <div
                            key={app.id}
                            className="bg-white p-4 rounded-xl border border-[#e0e3e5] hover:border-[#0058be] shadow-xs space-y-3 transition-all group"
                          >
                            {/* Card Top: Candidate Info & ATS Pill */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#0058be]/10 text-[#0058be] font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                                  {app.candidate?.profile_picture_url ? (
                                    <img
                                      src={resolvePhotoUrl(app.candidate.profile_picture_url)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    app.candidate?.full_name?.charAt(0) || 'C'
                                  )}
                                </div>
                                <div>
                                  <Link
                                    to={`/recruiter/applications/${app.id}`}
                                    className="font-bold text-xs text-[#191c1e] hover:text-[#0058be] transition-colors block line-clamp-1"
                                  >
                                    {app.candidate?.full_name}
                                  </Link>
                                  <span className="text-[10px] text-[#71787e] block line-clamp-1">
                                    {app.candidate?.headline || 'Candidate'}
                                  </span>
                                </div>
                              </div>

                              {/* ATS Match Score Pill */}
                              {app.ats_match?.match_percentage !== undefined &&
                                getMatchScorePill(app.ats_match.match_percentage)}
                            </div>

                            {/* Card Details: Applied Date */}
                            <div className="flex items-center justify-between text-[11px] text-[#71787e] pt-1 border-t border-[#f1f4f6]">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(app.applied_at).toLocaleDateString()}
                              </span>

                              <Link
                                to={`/recruiter/applications/${app.id}`}
                                className="text-[11px] font-bold text-[#0058be] hover:underline"
                              >
                                View Dossier
                              </Link>
                            </div>

                            {/* Move Stage Quick Dropdown */}
                            <div className="pt-2 flex items-center justify-between gap-1 border-t border-[#f1f4f6]">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleStageMove(app.id, parseInt(e.target.value, 10));
                                  }
                                }}
                                defaultValue=""
                                className="w-full text-[10px] font-semibold text-[#41474d] bg-[#f7f9fb] border border-[#e0e3e5] rounded-lg px-2 py-1 outline-none cursor-pointer"
                              >
                                <option value="" disabled>
                                  Move to Stage...
                                </option>
                                {stages.map((st) => (
                                  <option key={st.id} value={st.id}>
                                    Move → {st.name}
                                  </option>
                                ))}
                              </select>

                              {app.application_status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAppForReject(app);
                                    setRejectionModalOpen(true);
                                  }}
                                  className="p-1 rounded-md text-[#ba1a1a] hover:bg-rose-50"
                                  title="Reject Candidate"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* TABLE VIEW */
          /* ======================================================== */
          <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5] text-[#71787e] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-5">Candidate</th>
                    <th className="py-3.5 px-5">Current Stage</th>
                    <th className="py-3.5 px-5">Date Applied</th>
                    <th className="py-3.5 px-5">ATS Match</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f6]">
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/recruiter/applications/${app.id}`)}
                      className="hover:bg-[#f7f9fb] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0058be]/10 text-[#0058be] font-bold text-xs flex items-center justify-center">
                            {app.candidate?.full_name?.charAt(0) || 'C'}
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

                      <td className="py-4 px-5">
                        <span className="font-bold text-[#191c1e]">
                          {app.current_stage?.name || 'Applied'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-[#71787e]">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-5">
                        {app.ats_match?.match_percentage !== undefined
                          ? getMatchScorePill(app.ats_match.match_percentage)
                          : '—'}
                      </td>

                      <td
                        className="py-4 px-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/recruiter/applications/${app.id}`)}
                            className="px-3 py-1 rounded-lg border border-[#c1c7ce] text-[11px] font-bold text-[#41474d] hover:bg-[#f1f4f6]"
                          >
                            Dossier
                          </button>
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

