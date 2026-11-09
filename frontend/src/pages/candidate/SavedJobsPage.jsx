import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Search,
  MapPin,
  Building2,
  ExternalLink,
  Trash2,
  ArrowRight,
  Briefcase,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import Pagination from '../../components/common/Pagination';
import ApplyJobInfoModal from '../../components/candidate/ApplyJobInfoModal';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function SavedJobsPage() {
  const { showToast } = useToast();
  const [savedJobs, setSavedJobs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Apply modal
  const [activeApplyJob, setActiveApplyJob] = useState(null);

  const fetchSavedJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 9,
        sort: sortBy,
      };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (workModeFilter !== 'all') params.work_mode = workModeFilter;

      const res = await jobApi.getSavedJobs(params);
      setSavedJobs(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      setCurrentPage(page);
    } catch (err) {
      showToast('Unable to load saved jobs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, workModeFilter, sortBy, showToast]);

  useEffect(() => {
    fetchSavedJobs(1);
  }, [fetchSavedJobs]);

  const handleRemove = async (jobId) => {
    try {
      await jobApi.deleteSavedJob(jobId);
      setSavedJobs((prev) => prev.filter((item) => item.job?.id !== jobId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast('Job removed from bookmarks.', 'success');
    } catch (err) {
      showToast('Failed to remove saved job.', 'error');
    }
  };

  return (
    <CandidateLayout>
      <div className="space-y-6">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0e3e5]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#71787e] mb-1">
              Candidate Portal / Saved Jobs
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                Saved Jobs
              </h1>
              <span className="px-3 py-1 rounded-full bg-[#e8f0fe] text-[#0058be] text-xs font-bold">
                {totalCount} jobs saved
              </span>
            </div>
            <p className="text-sm text-[#41474d] mt-1">
              Review, manage, and quickly apply to positions you've bookmarked for later.
            </p>
          </div>

          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>Explore More Jobs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search & Filter Bar (Figma Page 3) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search input */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-[#71787e] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved jobs by title, company, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#71787e] focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
            />
          </div>

          {/* Filter Chips & Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Work Mode Chips */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#e0e3e5]">
              {[
                { label: 'All', val: 'all' },
                { label: 'Remote', val: 'remote' },
                { label: 'Hybrid', val: 'hybrid' },
                { label: 'On-site', val: 'onsite' },
              ].map((chip) => {
                const isActive = workModeFilter === chip.val;
                return (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setWorkModeFilter(chip.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0058be] text-white shadow-xs'
                        : 'text-[#41474d] hover:bg-[#f1f4f6]'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs font-semibold text-[#191c1e] focus:outline-hidden focus:border-[#0058be] cursor-pointer"
            >
              <option value="recent">Sort by: Recently Saved</option>
              <option value="salary_desc">Salary: High to Low</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#71787e]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
            <span className="text-sm font-medium">Loading your bookmarked jobs...</span>
          </div>
        ) : savedJobs.length === 0 ? (
          /* Empty State (Figma Page 3 Bottom) */
          <div className="bg-white rounded-3xl p-12 text-center border border-[#e0e3e5] space-y-4 max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center mx-auto shadow-xs">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#191c1e]">You haven't saved any jobs yet</h3>
            <p className="text-sm text-[#41474d] leading-relaxed">
              When you discover opportunities that match your career goals on Find Jobs, click the bookmark icon to review and apply to them here anytime.
            </p>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Browse Jobs</span>
            </Link>
          </div>
        ) : (
          /* Saved Jobs Grid (Figma Page 3) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedJobs.map((item) => {
              const job = item.job;
              if (!job) return null;
              const companyLogo = resolvePhotoUrl(job.company?.logo_url);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 border border-[#e0e3e5] hover:border-[#0058be]/40 hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
                >
                  {/* Top info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] flex items-center justify-center text-[#0058be] font-bold text-xs shrink-0 overflow-hidden">
                        {companyLogo ? (
                          <img src={companyLogo} alt={job.company?.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{job.company?.name?.slice(0, 2).toUpperCase() || 'CO'}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(job.id)}
                        className="p-1.5 rounded-lg text-[#71787e] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <Link
                        to={`/jobs/${job.id}`}
                        className="font-bold text-base text-[#191c1e] hover:text-[#0058be] transition-colors line-clamp-1 leading-snug"
                      >
                        {job.job_title}
                      </Link>
                      <div className="text-xs text-[#5a6066] mt-0.5">
                        {job.company?.name} • {job.location || 'Remote'}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {job.work_mode && (
                        <span className="px-2 py-0.5 rounded-md bg-[#e8f0fe] text-[#0058be] text-[11px] font-semibold">
                          {job.work_mode.value}
                        </span>
                      )}
                      {job.employment_type && (
                        <span className="px-2 py-0.5 rounded-md bg-[#f1f4f6] text-[#41474d] text-[11px] font-medium capitalize">
                          {job.employment_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Salary & Saved date */}
                    <div className="pt-1 text-xs">
                      {(job.salary_min || job.salary_max) && (
                        <div className="font-bold text-[#137333]">
                          {job.salary_min && job.salary_max
                            ? `$${Number(job.salary_min).toLocaleString()} - $${Number(job.salary_max).toLocaleString()}`
                            : `$${Number(job.salary_min || job.salary_max).toLocaleString()}`}
                        </div>
                      )}
                      <div className="text-[#71787e] text-[11px] mt-0.5">
                        Saved on {new Date(item.saved_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Apply CTA */}
                  <div className="pt-3 border-t border-[#f1f4f6] flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveApplyJob(job)}
                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="p-2 rounded-xl text-[#71787e] hover:text-[#0058be] hover:bg-[#e8f0fe] transition-colors"
                      title="View details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalCount > 9 && (
          <div className="pt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={9}
              onPageChange={(p) => fetchSavedJobs(p)}
            />
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <ApplyJobInfoModal
        isOpen={Boolean(activeApplyJob)}
        onClose={() => setActiveApplyJob(null)}
        job={activeApplyJob}
        isSaved={true}
        onSaveToggle={(saved) => {
          if (!saved && activeApplyJob) {
            handleRemove(activeApplyJob.id);
            setActiveApplyJob(null);
          }
        }}
      />
    </CandidateLayout>
  );
}

