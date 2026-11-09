import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Bookmark,
  Building2,
  Calendar,
  Filter,
  X,
  Sparkles,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import FooterSection from '../../components/FooterSection';
import Pagination from '../../components/common/Pagination';
import ApplyJobInfoModal from '../../components/candidate/ApplyJobInfoModal';
import jobApi from '../../api/jobApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function BrowseJobsPage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [jobs, setJobs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter taxonomies
  const [categories, setCategories] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [workModes, setWorkModes] = useState([]);

  // Search and Filter form states
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [selectedTypes, setSelectedTypes] = useState(searchParams.getAll('type') || []);
  const [selectedLevels, setSelectedLevels] = useState(searchParams.getAll('level') || []);
  const [selectedWorkModes, setSelectedWorkModes] = useState(searchParams.getAll('mode') || []);
  const [salaryMin, setSalaryMin] = useState(searchParams.get('salary_min') || '');
  const [salaryMax, setSalaryMax] = useState(searchParams.get('salary_max') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get('remote_only') === 'true');

  // Modal states
  const [activeApplyJob, setActiveApplyJob] = useState(null);

  // Load master data filters on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const [catRes, expRes, modeRes] = await Promise.all([
          masterDataApi.getCategoryItems('job_category'),
          masterDataApi.getCategoryItems('experience_level'),
          masterDataApi.getCategoryItems('work_mode'),
        ]);
        setCategories(catRes.data?.results || catRes.data || []);
        setExperienceLevels(expRes.data?.results || expRes.data || []);
        setWorkModes(modeRes.data?.results || modeRes.data || []);
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadFilters();
  }, []);

  // Fetch Jobs
  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 9,
        sort: sortBy,
      };
      if (keyword.trim()) params.q = keyword.trim();
      if (location.trim()) params.location = location.trim();
      if (remoteOnly) params.remote_only = 'true';
      if (salaryMin) params.salary_min = salaryMin;
      if (salaryMax) params.salary_max = salaryMax;

      if (selectedTypes.length === 1) params.employment_type = selectedTypes[0];
      if (selectedLevels.length === 1) params.experience_level = selectedLevels[0];
      if (selectedWorkModes.length === 1) params.work_mode = selectedWorkModes[0];

      const res = await jobApi.getJobs(params);
      setJobs(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      setCurrentPage(page);
    } catch (err) {
      showToast('Unable to load job postings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [keyword, location, remoteOnly, salaryMin, salaryMax, selectedTypes, selectedLevels, selectedWorkModes, sortBy, showToast]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs(1);
  };

  // Toggle Save Job Bookmark
  const handleToggleSave = async (jobId, currentSaved) => {
    if (!isAuthenticated) {
      showToast('Please sign in as a candidate to save jobs.', 'info');
      return;
    }
    if (user?.role !== 'candidate') {
      showToast('Only candidate accounts can bookmark jobs.', 'info');
      return;
    }

    // Optimistic UI update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_saved: !currentSaved } : j))
    );

    try {
      const res = await jobApi.toggleSavedJob(jobId);
      showToast(res.data?.message || 'Bookmark updated', 'success');
    } catch (err) {
      // Revert on error
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, is_saved: currentSaved } : j))
      );
      showToast('Failed to update bookmark.', 'error');
    }
  };

  // Clear All Filters
  const handleClearFilters = () => {
    setKeyword('');
    setLocation('');
    setSelectedTypes([]);
    setSelectedLevels([]);
    setSelectedWorkModes([]);
    setSalaryMin('');
    setSalaryMax('');
    setRemoteOnly(false);
    setSortBy('newest');
  };

  const hasActiveFilters =
    keyword ||
    location ||
    selectedTypes.length > 0 ||
    selectedLevels.length > 0 ||
    selectedWorkModes.length > 0 ||
    salaryMin ||
    salaryMax ||
    remoteOnly;

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col text-[#191c1e]">
      <Navbar />

      {/* Hero Search Section (Figma Page 1) */}
      <section className="bg-white border-b border-[#e0e3e5] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191c1e] mb-6">
            Find your next role.
          </h1>

          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch gap-3">
            {/* Keyword Input */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-[#71787e] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Job title, keywords, or company..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#c1c7ce] bg-[#f7f9fb] text-sm text-[#191c1e] placeholder:text-[#71787e] focus:bg-white focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 transition-all"
              />
            </div>

            {/* Location Input */}
            <div className="flex-1 relative">
              <MapPin className="w-5 h-5 text-[#71787e] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state, or remote..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#c1c7ce] bg-[#f7f9fb] text-sm text-[#191c1e] placeholder:text-[#71787e] focus:bg-white focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 transition-all"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl font-semibold text-sm text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>
        </div>
      </section>

      {/* Main Content Area: Sidebar Filters + Job Cards Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Left Filter Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e5]">
            <div className="flex items-center gap-2 font-bold text-base text-[#191c1e]">
              <Filter className="w-4 h-4 text-[#0058be]" />
              <span>Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Job Type Filters */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71787e] mb-3">
              Job Type
            </h4>
            <div className="space-y-2.5">
              {[
                { label: 'Full-time', val: 'full_time' },
                { label: 'Part-time', val: 'part_time' },
                { label: 'Contract', val: 'contract' },
                { label: 'Internship', val: 'internship' },
              ].map((t) => {
                const checked = selectedTypes.includes(t.val);
                return (
                  <label key={t.val} className="flex items-center gap-2.5 text-sm text-[#41474d] cursor-pointer hover:text-[#191c1e]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedTypes((prev) =>
                          checked ? prev.filter((x) => x !== t.val) : [...prev, t.val]
                        );
                      }}
                      className="w-4 h-4 rounded text-[#0058be] border-[#c1c7ce] focus:ring-[#0058be]"
                    />
                    <span>{t.label}</span>
                  </label>
                );
              })}
              <label className="flex items-center gap-2.5 text-sm text-[#41474d] cursor-pointer hover:text-[#191c1e] pt-1">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0058be] border-[#c1c7ce] focus:ring-[#0058be]"
                />
                <span className="font-medium text-[#0058be]">Remote Option</span>
              </label>
            </div>
          </div>

          {/* Experience Level Filters */}
          {experienceLevels.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#71787e] mb-3">
                Experience Level
              </h4>
              <div className="space-y-2.5">
                {experienceLevels.map((exp) => {
                  const checked = selectedLevels.includes(String(exp.id));
                  return (
                    <label key={exp.id} className="flex items-center gap-2.5 text-sm text-[#41474d] cursor-pointer hover:text-[#191c1e]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedLevels((prev) =>
                            checked ? prev.filter((x) => x !== String(exp.id)) : [...prev, String(exp.id)]
                          );
                        }}
                        className="w-4 h-4 rounded text-[#0058be] border-[#c1c7ce] focus:ring-[#0058be]"
                      />
                      <span>{exp.value}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Work Mode Filters */}
          {workModes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#71787e] mb-3">
                Work Mode
              </h4>
              <div className="space-y-2.5">
                {workModes.map((wm) => {
                  const checked = selectedWorkModes.includes(String(wm.id));
                  return (
                    <label key={wm.id} className="flex items-center gap-2.5 text-sm text-[#41474d] cursor-pointer hover:text-[#191c1e]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedWorkModes((prev) =>
                            checked ? prev.filter((x) => x !== String(wm.id)) : [...prev, String(wm.id)]
                          );
                        }}
                        className="w-4 h-4 rounded text-[#0058be] border-[#c1c7ce] focus:ring-[#0058be]"
                      />
                      <span>{wm.value}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Salary Range Filter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71787e] mb-3">
              Salary Range
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min ($)"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-1/2 px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
              />
              <span className="text-[#71787e] text-xs">–</span>
              <input
                type="number"
                placeholder="Max ($)"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-1/2 px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
              />
            </div>
          </div>
        </aside>

        {/* Center Job Postings List */}
        <section className="flex-1 space-y-4">
          {/* Top Bar: Count & Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e0e3e5]">
            <span className="text-sm font-semibold text-[#41474d]">
              <span className="text-[#191c1e] font-bold">{totalCount}</span> jobs match your criteria
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-[#71787e] font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#c1c7ce] bg-white text-xs font-semibold text-[#191c1e] focus:outline-hidden focus:border-[#0058be] cursor-pointer"
              >
                <option value="newest">Most Relevant (Newest)</option>
                <option value="salary_desc">Highest Salary</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#71787e]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
              <span className="text-sm font-medium">Searching opportunities...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#e0e3e5] space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f1f4f6] text-[#71787e] flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#191c1e]">No matching jobs found</h3>
              <p className="text-sm text-[#41474d] max-w-md mx-auto">
                We couldn't find any opportunities matching your active filters. Try broadening your keywords or clearing selected filters.
              </p>
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {jobs.map((job) => {
                const companyLogo = resolvePhotoUrl(job.company?.logo_url);
                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl p-5 border border-[#e0e3e5] hover:border-[#0058be]/40 hover:shadow-md transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    {/* Left Info */}
                    <div className="flex items-start gap-4">
                      {/* Logo / Initials */}
                      <Link to={`/companies/${job.company?.id}`} className="shrink-0 mt-1">
                        <div className="w-12 h-12 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] flex items-center justify-center overflow-hidden font-bold text-sm text-[#0058be] shadow-xs">
                          {companyLogo ? (
                            <img src={companyLogo} alt={job.company?.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{job.company?.name?.slice(0, 2).toUpperCase() || 'CO'}</span>
                          )}
                        </div>
                      </Link>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-bold text-base text-[#191c1e] group-hover:text-[#0058be] transition-colors leading-snug"
                          >
                            {job.job_title}
                          </Link>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#5a6066] flex-wrap">
                          <Link to={`/companies/${job.company?.id}`} className="font-semibold text-[#191c1e] hover:underline">
                            {job.company?.name}
                          </Link>
                          <span>•</span>
                          <span>{job.location || 'Remote'}</span>
                        </div>

                        {/* Badges row */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {job.work_mode && (
                            <span className="px-2.5 py-0.5 rounded-md bg-[#e8f0fe] text-[#0058be] text-xs font-semibold">
                              {job.work_mode.value}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="px-2.5 py-0.5 rounded-md bg-[#f1f4f6] text-[#41474d] text-xs font-medium capitalize">
                              {job.employment_type.replace('_', ' ')}
                            </span>
                          )}
                          {(job.salary_min || job.salary_max) && (
                            <span className="px-2.5 py-0.5 rounded-md bg-[#e6f4ea] text-[#137333] text-xs font-semibold">
                              {job.salary_min && job.salary_max
                                ? `$${Number(job.salary_min).toLocaleString()} - $${Number(job.salary_max).toLocaleString()}`
                                : `$${Number(job.salary_min || job.salary_max).toLocaleString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#f1f4f6]">
                      <button
                        type="button"
                        onClick={() => handleToggleSave(job.id, job.is_saved)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          job.is_saved
                            ? 'bg-[#e8f0fe] border-[#0058be] text-[#0058be]'
                            : 'border-[#c1c7ce] text-[#71787e] hover:border-[#0058be] hover:text-[#0058be] bg-white'
                        }`}
                        title={job.is_saved ? 'Remove from saved' : 'Save job'}
                      >
                        <Bookmark className={`w-4 h-4 ${job.is_saved ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveApplyJob(job)}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* "Save your search" card (Figma Page 1) */}
          <div className="p-5 rounded-2xl bg-white border border-[#e0e3e5] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#191c1e]">Save your search</h4>
                <p className="text-xs text-[#71787e]">
                  {isAuthenticated
                    ? 'Bookmark jobs to review and track applications anytime.'
                    : 'Sign in to track jobs and bookmark opportunities for later.'}
                </p>
              </div>
            </div>

            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0058be] border border-[#0058be] hover:bg-[#e8f0fe] transition-colors shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 9 && (
            <div className="pt-4 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={9}
                onPageChange={(p) => fetchJobs(p)}
              />
            </div>
          )}
        </section>
      </main>

      {/* Apply Info Modal */}
      <ApplyJobInfoModal
        isOpen={Boolean(activeApplyJob)}
        onClose={() => setActiveApplyJob(null)}
        job={activeApplyJob}
        isSaved={activeApplyJob?.is_saved}
        onSaveToggle={(saved) => {
          if (activeApplyJob) {
            setJobs((prev) =>
              prev.map((j) => (j.id === activeApplyJob.id ? { ...j, is_saved: saved } : j))
            );
            setActiveApplyJob((prev) => (prev ? { ...prev, is_saved: saved } : null));
          }
        }}
      />

      <FooterSection />
    </div>
  );
}

