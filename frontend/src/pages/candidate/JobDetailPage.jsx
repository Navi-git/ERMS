import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Bookmark,
  Share2,
  AlertTriangle,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Clock,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import FooterSection from '../../components/FooterSection';
import ApplyJobInfoModal from '../../components/candidate/ApplyJobInfoModal';
import ReportJobModal from '../../components/candidate/ReportJobModal';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    async function fetchJobDetail() {
      setLoading(true);
      try {
        const res = await jobApi.getJob(id);
        setJob(res.data);
        setIsSaved(Boolean(res.data.is_saved));
      } catch (err) {
        showToast('Job posting not found or is no longer active.', 'error');
        navigate('/jobs');
      } finally {
        setLoading(false);
      }
    }
    fetchJobDetail();
  }, [id, navigate, showToast]);

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in as a candidate to save jobs.', 'info');
      return;
    }
    if (user?.role !== 'candidate') {
      showToast('Only candidate accounts can bookmark jobs.', 'info');
      return;
    }

    const previous = isSaved;
    setIsSaved(!previous);
    try {
      const res = await jobApi.toggleSavedJob(job.id);
      setIsSaved(Boolean(res.data?.saved));
      showToast(res.data?.message || 'Bookmark updated', 'success');
    } catch (err) {
      setIsSaved(previous);
      showToast('Failed to update bookmark.', 'error');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job?.job_title,
        text: `Check out this opening at ${job?.company?.name}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#71787e]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
          <span className="text-sm font-medium">Loading job details...</span>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const companyLogo = resolvePhotoUrl(job.company?.logo_url);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col text-[#191c1e]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#71787e] hover:text-[#0058be] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Find Jobs</span>
        </Link>

        {/* Header Hero Card (Figma Page 2) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Company Logo */}
              <Link to={`/companies/${job.company?.id}`} className="shrink-0 mt-1">
                <div className="w-16 h-16 rounded-2xl border border-[#e0e3e5] bg-[#f7f9fb] flex items-center justify-center overflow-hidden font-bold text-lg text-[#0058be] shadow-xs">
                  {companyLogo ? (
                    <img src={companyLogo} alt={job.company?.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{job.company?.name?.slice(0, 2).toUpperCase() || 'CO'}</span>
                  )}
                </div>
              </Link>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight leading-tight">
                  {job.job_title}
                </h1>

                <div className="flex items-center gap-2.5 text-sm text-[#41474d] flex-wrap">
                  <Link
                    to={`/companies/${job.company?.id}`}
                    className="font-bold text-[#191c1e] hover:text-[#0058be] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>{job.company?.name}</span>
                    <ShieldCheck className="w-4 h-4 text-[#0058be]" />
                  </Link>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-[#71787e]" />
                    {job.location || 'Remote'}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {job.work_mode && (
                    <span className="px-3 py-1 rounded-lg bg-[#e8f0fe] text-[#0058be] text-xs font-bold">
                      {job.work_mode.value}
                    </span>
                  )}
                  {job.employment_type && (
                    <span className="px-3 py-1 rounded-lg bg-[#f1f4f6] text-[#41474d] text-xs font-semibold capitalize">
                      {job.employment_type.replace('_', ' ')}
                    </span>
                  )}
                  {(job.salary_min || job.salary_max) && (
                    <span className="px-3 py-1 rounded-lg bg-[#e6f4ea] text-[#137333] text-xs font-bold">
                      {job.salary_min && job.salary_max
                        ? `$${Number(job.salary_min).toLocaleString()} - $${Number(job.salary_max).toLocaleString()} ${job.salary_currency}`
                        : `$${Number(job.salary_min || job.salary_max).toLocaleString()} ${job.salary_currency}`}
                    </span>
                  )}
                  {job.openings > 1 && (
                    <span className="px-3 py-1 rounded-lg bg-[#fff8e1] text-[#b06000] text-xs font-semibold">
                      {job.openings} Openings
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-0 border-[#f1f4f6]">
              <button
                type="button"
                onClick={() => setApplyModalOpen(true)}
                className="flex-1 md:flex-initial px-6 py-3 rounded-2xl font-bold text-sm text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer text-center"
              >
                Apply Now
              </button>

              <button
                type="button"
                onClick={handleToggleSave}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-[#e8f0fe] border-[#0058be] text-[#0058be]'
                    : 'border-[#c1c7ce] text-[#71787e] hover:border-[#0058be] hover:text-[#0058be] bg-white'
                }`}
                title={isSaved ? 'Remove Bookmark' : 'Save Job'}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-3 rounded-2xl border border-[#c1c7ce] text-[#71787e] hover:border-[#0058be] hover:text-[#0058be] bg-white transition-all cursor-pointer"
                title="Share Job"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="p-3 rounded-2xl border border-[#c1c7ce] text-[#71787e] hover:border-[#ba1a1a] hover:text-[#ba1a1a] bg-white transition-all cursor-pointer"
                title="Report this listing"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Content: 2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Overview */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-4">
              <h2 className="text-xl font-bold text-[#191c1e] tracking-tight">
                Job Overview
              </h2>
              <div className="text-sm text-[#41474d] leading-relaxed whitespace-pre-line">
                {job.job_description || 'No detailed overview provided.'}
              </div>
            </section>

            {/* Key Responsibilities */}
            {job.responsibilities && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-4">
                <h2 className="text-xl font-bold text-[#191c1e] tracking-tight">
                  Key Responsibilities
                </h2>
                <div className="text-sm text-[#41474d] leading-relaxed whitespace-pre-line">
                  {job.responsibilities}
                </div>
              </section>
            )}

            {/* Requirements */}
            {job.requirements && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-4">
                <h2 className="text-xl font-bold text-[#191c1e] tracking-tight">
                  Requirements & Qualifications
                </h2>
                <div className="text-sm text-[#41474d] leading-relaxed whitespace-pre-line">
                  {job.requirements}
                </div>
              </section>
            )}

            {/* Skills & Competencies */}
            {job.skills?.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-4">
                <h2 className="text-xl font-bold text-[#191c1e] tracking-tight">
                  Required & Desired Skills
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {job.skills.map((s) => (
                    <div
                      key={s.id || s.skill_id}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                        s.is_required
                          ? 'bg-[#e8f0fe] border-[#c3d9fe] text-[#0058be]'
                          : 'bg-[#f7f9fb] border-[#e0e3e5] text-[#41474d]'
                      }`}
                    >
                      <span>{s.skill_name || s.name}</span>
                      {s.is_required && (
                        <span className="text-[10px] uppercase font-bold text-[#0058be] opacity-75">
                          Required
                        </span>
                      )}
                      {s.proficiency_level && (
                        <span className="text-[10px] text-[#71787e] capitalize">
                          ({s.proficiency_level})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column (Sidebars / Cards: 1 Col) */}
          <div className="space-y-6">
            {/* Job Details Widget */}
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                Job Details
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#71787e] flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Posted
                  </span>
                  <span className="font-semibold text-[#191c1e]">
                    {job.published_at
                      ? new Date(job.published_at).toLocaleDateString()
                      : 'Recently'}
                  </span>
                </div>

                {job.application_deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#71787e] flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Deadline
                    </span>
                    <span className="font-semibold text-[#191c1e]">
                      {new Date(job.application_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[#71787e] flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Applicants
                  </span>
                  <span className="font-semibold text-[#0058be]">
                    {job.applicants_count || 0} applied
                  </span>
                </div>
              </div>
            </div>

            {/* Company Perks & Benefits */}
            {job.benefits?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                  Company Perks & Benefits
                </h3>
                <div className="space-y-3">
                  {job.benefits.map((b) => (
                    <div key={b.id || b.benefit_name} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-sm text-[#191c1e]">
                          {b.benefit_name}
                        </div>
                        {b.custom_description && (
                          <div className="text-xs text-[#71787e] mt-0.5">
                            {b.custom_description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About Company Widget */}
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                About {job.company?.name}
              </h3>
              <p className="text-sm text-[#41474d] leading-relaxed line-clamp-4">
                {job.company?.description || 'Leading enterprise company providing innovative solutions.'}
              </p>
              <Link
                to={`/companies/${job.company?.id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0058be] hover:underline"
              >
                <span>View Company Profile</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ApplyJobInfoModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        job={job}
        isSaved={isSaved}
        onSaveToggle={(saved) => setIsSaved(saved)}
      />

      <ReportJobModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        jobId={job.id}
        jobTitle={job.job_title}
      />

      <FooterSection />
    </div>
  );
}

