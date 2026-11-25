import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Users,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  DollarSign,
  MapPin,
  CheckCircle2,
  Loader2,
  GitCommit,
  Building2,
  ChevronDown,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';
import { formatSalaryRange } from '../../utils/currency';
import MarkdownContent from '../../components/common/MarkdownContent';

export default function RecruiterJobOverviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      try {
        const res = await jobApi.getJobOverview(id);
        setData(res.data);
      } catch (err) {
        showToast('Unable to load job overview.', 'error');
        navigate('/recruiter/jobs');
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, [id, navigate, showToast]);

  const handleResumeJob = async () => {
    if (!window.confirm('Resume this job listing? It will become active and visible to candidates again.')) {
      return;
    }
    setResuming(true);
    try {
      await jobApi.resumeJob(id);
      showToast('Job listing has been resumed and is now active.', 'success');
      const res = await jobApi.getJobOverview(id);
      setData(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resume job.';
      showToast(msg, 'error');
    } finally {
      setResuming(false);
    }
  };

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#71787e]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
          <span className="text-sm font-medium">Loading job overview...</span>
        </div>
      </RecruiterLayout>
    );
  }

  if (!data || !data.job) return null;

  const job = data.job;
  const metrics = data.metrics || {};
  const stagesSummary = data.stages_summary || [];

  const statusStyles = {
    published: 'bg-[#e6f4ea] text-[#137333]',
    draft: 'bg-[#fff8e1] text-[#b06000]',
    on_hold: 'bg-[#fff8e1] text-[#b06000] border border-[#ffe082]',
    closed: 'bg-[#fce8e6] text-[#c5221f]',
  }[job.job_status] || 'bg-[#f1f4f6] text-[#71787e]';

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-12">
        {/* Back Link */}
        <Link
          to="/recruiter/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71787e] hover:text-[#0058be]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Job Postings</span>
        </Link>

        {/* Top Header Card (Figma Page 10) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles}`}>
                  {job.job_status === 'published' ? 'Active' : job.job_status.replace('_', ' ')}
                </span>
                <span className="text-xs text-[#71787e]">
                  {job.published_at
                    ? `Posted ${new Date(job.published_at).toLocaleDateString()}`
                    : `Created ${new Date(job.created_at).toLocaleDateString()}`}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                {job.job_title}
              </h1>

              <div className="flex items-center gap-2 text-xs text-[#5a6066] flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location || 'Remote'}
                </span>
                <span>•</span>
                <span>{job.department?.value || 'General'}</span>
                <span>•</span>
                <span className="capitalize">{job.employment_type?.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap">
              <Link
                to={`/jobs/${job.id}`}
                target="_blank"
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-[#c1c7ce] font-semibold text-xs text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Listing</span>
              </Link>

              <Link
                to={`/recruiter/jobs/${job.id}/pipeline`}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-[#0058be] font-bold text-xs text-[#0058be] hover:bg-[#e8f0fe] transition-colors flex items-center justify-center gap-1.5"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Pipeline Board</span>
              </Link>

              <Link
                to={`/recruiter/jobs/${job.id}/edit`}
                className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Job</span>
              </Link>
            </div>
          </div>
        </div>

        {/* On Hold Notification Banner */}
        {job.job_status === 'on_hold' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-[#fff8e1] border border-[#ffe082] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <PauseCircle className="w-5 h-5 text-[#b06000] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#7c4a00]">
                      Job Listing is Placed On Hold
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#ffe082] text-[#7c4a00] text-[10px] font-bold uppercase tracking-wider">
                      Delisted from public board
                    </span>
                  </div>
                  <p className="text-xs text-[#9a5b00] leading-relaxed">
                    This job is temporarily hidden from candidate search results and cannot receive new applications. Existing candidates in your pipeline remain accessible for evaluation.
                  </p>
                </div>
              </div>

              {/* If hold was initiated by recruiter (self-paused), show Resume button */}
              {job.on_hold_reason?.toLowerCase().includes('recruiter') && (
                <button
                  type="button"
                  onClick={handleResumeJob}
                  disabled={resuming}
                  className="px-4 py-2 rounded-xl bg-[#137333] hover:bg-[#0f5b28] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  {resuming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  <span>Resume Listing</span>
                </button>
              )}
            </div>

            {/* Prominent Reason Card */}
            <div className="bg-white/90 rounded-2xl p-4 border border-[#ffe082]/70 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7c4a00] block">
                Reason for Hold:
              </span>
              <p className="text-xs font-semibold text-[#191c1e] whitespace-pre-line">
                {job.on_hold_reason || 'Administrative policy review in progress.'}
              </p>
            </div>

            {!job.on_hold_reason?.toLowerCase().includes('recruiter') && (
              <p className="text-[11px] text-[#7c4a00]/90 italic">
                Note: This listing was placed on hold by platform administration. If updates are needed, please edit the job or contact platform administration to request reactivation.
              </p>
            )}
          </div>
        )}

        {/* 4 Top Metric Cards (Figma Page 10) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to={`/recruiter/jobs/${job.id}/pipeline`}
            className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs hover:border-[#0058be] transition-colors group cursor-pointer block"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e] group-hover:text-[#0058be]">
              Total Applications
            </span>
            <div className="text-2xl font-black text-[#191c1e] mt-1">
              {metrics.total_applications || 0}
            </div>
            <div className="text-[11px] text-[#0058be] font-medium mt-0.5">
              View pipeline &rarr;
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
              Average ATS Score
            </span>
            <div className="text-2xl font-black text-[#137333] mt-1">
              {metrics.average_ats_score || 0}%
            </div>
            <div className="text-[11px] text-[#71787e] mt-0.5">Resume alignment</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
              Time to Fill (Est)
            </span>
            <div className="text-2xl font-black text-[#191c1e] mt-1">
              {metrics.time_to_fill_days || 30} days
            </div>
            <div className="text-[11px] text-[#71787e] mt-0.5">Industry benchmark</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e0e3e5] shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
              Active Pipeline
            </span>
            <div className="text-2xl font-black text-[#0058be] mt-1">
              {metrics.active_pipeline || 0}
            </div>
            <div className="text-[11px] text-[#71787e] mt-0.5">Candidates in progress</div>
          </div>
        </div>

        {/* 2-Column Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Pipeline Stages & Applicant Preview (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pipeline Summary (Figma Page 10) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-5 h-5 text-[#0058be]" />
                  <h3 className="font-bold text-base text-[#191c1e]">Pipeline Summary</h3>
                </div>
                <Link
                  to={`/recruiter/jobs/${job.id}/pipeline`}
                  className="text-xs font-bold text-[#0058be] hover:underline"
                >
                  Open Board &rarr;
                </Link>
              </div>

              <div
                className={`grid gap-3 ${
                  stagesSummary.length === 1
                    ? 'grid-cols-1'
                    : stagesSummary.length === 2
                    ? 'grid-cols-2'
                    : stagesSummary.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : stagesSummary.length === 4
                    ? 'grid-cols-2 sm:grid-cols-4'
                    : stagesSummary.length === 5
                    ? 'grid-cols-2 sm:grid-cols-5'
                    : stagesSummary.length === 6
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                }`}
              >
                {stagesSummary.map((st) => (
                  <Link
                    key={st.id}
                    to={`/recruiter/jobs/${job.id}/pipeline`}
                    className="p-3.5 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] hover:border-[#0058be] transition-colors space-y-1.5 block cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#0058be] group-hover:underline">Stage {st.stage_order}</span>
                      <span className="text-[10px] text-[#71787e] capitalize">{st.stage_type}</span>
                    </div>
                    <div className="font-bold text-sm text-[#191c1e] line-clamp-1">
                      {st.name}
                    </div>
                    <div className="text-xs font-semibold text-[#71787e]">
                      {st.count || 0} candidates
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Applicant Pipeline Preview Callout */}
            <div className="bg-white rounded-3xl p-8 border border-[#e0e3e5] text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#191c1e]">
                  Candidates Pipeline Kanban Board
                </h3>
                <p className="text-xs text-[#71787e] max-w-md mx-auto leading-relaxed">
                  Evaluate resumes with real-time ATS match scoring, drag candidates across interview stages, add internal recruiter notes, and review submitted materials.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-1">
                <Link
                  to={`/recruiter/jobs/${job.id}/pipeline`}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>Open Pipeline Board</span>
                </Link>
                <Link
                  to={`/recruiter/applicants?job_id=${job.id}`}
                  className="px-5 py-2.5 rounded-xl border border-[#c1c7ce] font-semibold text-xs text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View All Candidates</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Job Details & Description Preview (1 Col) */}
          <div className="space-y-6">
            {/* Job Details Card (Figma Page 10) */}
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                Job Details
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[#71787e] block mb-0.5">Author / Recruiter</span>
                  <div className="font-bold text-sm text-[#191c1e]">{job.company_name}</div>
                </div>

                <div>
                  <span className="text-[#71787e] block mb-0.5">Target Compensation</span>
                  <div className="font-bold text-sm text-[#137333]">
                    {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency, 'year')}
                  </div>
                </div>

                {job.skills?.length > 0 && (
                  <div>
                    <span className="text-[#71787e] block mb-2">Required Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((s) => (
                        <span
                          key={s.id || s.skill_id}
                          className="px-2.5 py-1 rounded-lg bg-[#e8f0fe] text-[#0058be] text-[11px] font-semibold"
                        >
                          {s.skill_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.job_status === 'on_hold' && job.on_hold_reason && (
                  <div className="pt-3 border-t border-[#f1f4f6]">
                    <span className="text-[#71787e] block mb-1 font-semibold text-[11px] uppercase tracking-wider">
                      On-Hold Reason
                    </span>
                    <div className="text-xs font-semibold text-[#b06000] bg-[#fff8e1] p-3 rounded-xl border border-[#ffe082] leading-relaxed">
                      {job.on_hold_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description Preview (Figma Page 10) */}
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                Description Preview
              </h3>

              <div className="space-y-3">
                <div className={`text-xs text-[#41474d] leading-relaxed ${expandedDesc ? '' : 'line-clamp-4'}`}>
                  <MarkdownContent content={job.job_description || ''} />
                </div>

                {expandedDesc && (
                  <div className="space-y-3 pt-3 border-t border-[#f1f4f6]">
                    {job.responsibilities && (
                      <div>
                        <h4 className="font-bold text-xs text-[#191c1e] mb-1">Responsibilities:</h4>
                        <div className="text-xs text-[#71787e]">
                          <MarkdownContent content={job.responsibilities} />
                        </div>
                      </div>
                    )}
                    {job.requirements && (
                      <div>
                        <h4 className="font-bold text-xs text-[#191c1e] mb-1">Requirements:</h4>
                        <div className="text-xs text-[#71787e]">
                          <MarkdownContent content={job.requirements} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedDesc(!expandedDesc)}
                  className="text-xs font-bold text-[#0058be] hover:underline cursor-pointer"
                >
                  {expandedDesc ? 'Collapse' : 'Read Full Description'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}

