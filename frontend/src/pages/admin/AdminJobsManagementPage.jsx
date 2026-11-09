import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Download,
  MoreVertical,
  CheckCircle,
  PauseCircle,
  XCircle,
  PlayCircle,
  Loader2,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/common/Pagination';
import jobApi from '../../api/jobApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';

export default function AdminJobsManagementPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [categories, setCategories] = useState([]);

  // Data
  const [jobs, setJobs] = useState([]);
  const [metrics, setMetrics] = useState({
    total_listings: 0,
    active_listings: 0,
    closed_listings: 0,
    on_hold_listings: 0,
    draft_listings: 0,
    reported_listings: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals & Menu
  const [statusMenuOpenId, setStatusMenuOpenId] = useState(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await masterDataApi.getCategoryItems('job_category');
        setCategories(res.data?.results || res.data || []);
      } catch (err) {}
    }
    loadCategories();
  }, []);

  const fetchAdminJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 15,
      };
      if (activeTab !== 'all') params.status = activeTab;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCat) params.category_id = selectedCat;

      const res = await jobApi.getAdminJobs(params);
      setJobs(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      if (res.data?.metrics) {
        setMetrics(res.data.metrics);
      }
      setCurrentPage(page);
    } catch (err) {
      showToast('Unable to load jobs for administration.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedCat, showToast]);

  useEffect(() => {
    fetchAdminJobs(1);
  }, [fetchAdminJobs]);

  const handleUpdateStatus = async (jobId, newStatus, reason = '') => {
    try {
      await jobApi.updateAdminJobStatus(jobId, { status: newStatus, reason });
      showToast(`Job status updated to ${newStatus}.`, 'success');
      fetchAdminJobs(currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update job status.';
      showToast(msg, 'error');
    } finally {
      setStatusMenuOpenId(null);
    }
  };

  const handleFlagJob = async (jobId) => {
    const reason = window.prompt('Enter reason for flagging this listing:', 'Administrative policy check');
    if (!reason) return;

    try {
      await jobApi.flagAdminJob(jobId, { reason });
      showToast('Job flagged and reported for moderation review.', 'success');
      fetchAdminJobs(currentPage);
    } catch (err) {
      showToast('Failed to flag job.', 'error');
    }
  };

  const handleExportCSV = () => {
    if (jobs.length === 0) return;
    const headers = ['ID', 'Job Title', 'Company', 'Category', 'Status', 'Posted Date'];
    const rows = jobs.map((j) => [
      j.id,
      `"${j.job_title}"`,
      `"${j.company_name}"`,
      `"${j.category_name || ''}"`,
      j.job_status,
      j.published_at || j.created_at,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `talentbridge_jobs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header (Figma Page 11) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e8ec]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#717680] mb-1">
              Super Admin Portal / Governance
            </div>
            <h1 className="text-2xl font-black text-[#191c1e] tracking-tight">
              Job Management
            </h1>
            <p className="text-xs text-[#535862] mt-0.5">
              Platform-wide directory, policy compliance inspection, and moderation oversight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl border border-[#d5d7da] bg-white text-xs font-semibold text-[#414651] hover:bg-[#f8f9fa] shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards (Figma Page 11) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717680]">Total Listings</span>
            <div className="text-2xl font-black text-[#191c1e] mt-1">{metrics.total_listings}</div>
            <div className="text-[11px] text-[#535862] mt-0.5">Across all companies</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717680]">Active Live</span>
            <div className="text-2xl font-black text-[#137333] mt-1">{metrics.active_listings}</div>
            <div className="text-[11px] text-[#137333] font-medium mt-0.5">Discoverable by candidates</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717680]">On Hold</span>
            <div className="text-2xl font-black text-[#b06000] mt-1">{metrics.on_hold_listings}</div>
            <div className="text-[11px] text-[#717680] mt-0.5">Temporarily restricted</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e8ec] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717680]">Reported Jobs</span>
            <div className="text-2xl font-black text-[#ba1a1a] mt-1">{metrics.reported_listings}</div>
            <div className="text-[11px] text-[#ba1a1a] font-medium mt-0.5">Flagged for policy review</div>
          </div>
        </div>

        {/* Status Tabs (Figma Page 11) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e5e8ec] overflow-x-auto pb-px">
            {[
              { id: 'all', label: `All Jobs (${metrics.total_listings})` },
              { id: 'active', label: `Active (${metrics.active_listings})` },
              { id: 'on_hold', label: `On Hold (${metrics.on_hold_listings})` },
              { id: 'closed', label: `Closed (${metrics.closed_listings})` },
              { id: 'reported', label: `Reported (${metrics.reported_listings})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-xs font-bold tracking-tight border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#0058be] text-[#0058be]'
                      : 'border-transparent text-[#717680] hover:text-[#191c1e]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:max-w-md relative">
              <Search className="w-4 h-4 text-[#717680] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, companies, author emails..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#d5d7da] bg-white text-xs text-[#191c1e] placeholder:text-[#717680] focus:outline-hidden focus:border-[#0058be]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#d5d7da] bg-white text-xs font-semibold text-[#191c1e] focus:outline-hidden focus:border-[#0058be] cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.value}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Master Table (Figma Page 11) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#717680]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
            <span className="text-sm font-medium">Loading platform jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#e5e8ec] space-y-3">
            <Briefcase className="w-10 h-10 text-[#717680] mx-auto" />
            <h3 className="text-base font-bold text-[#191c1e]">No listings found</h3>
            <p className="text-xs text-[#717680]">Try adjusting your search query or tab filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e5e8ec] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e5e8ec] text-[#717680] uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-4">Job Title / Company</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Posted Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Reports</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {jobs.map((job) => {
                    const statusStyles = {
                      published: 'bg-[#e6f4ea] text-[#137333]',
                      draft: 'bg-[#fff8e1] text-[#b06000]',
                      on_hold: 'bg-[#f1f4f6] text-[#717680]',
                      closed: 'bg-[#fce8e6] text-[#c5221f]',
                    }[job.job_status] || 'bg-[#f1f4f6] text-[#717680]';

                    const isMenuOpen = statusMenuOpenId === job.id;

                    return (
                      <tr key={job.id} className="hover:bg-[#f8f9fa]/60 transition-colors">
                        <td className="py-4 px-4 font-semibold text-[#191c1e]">
                          <Link
                            to={`/admin/jobs/${job.id}`}
                            className="font-bold text-sm text-[#191c1e] hover:text-[#0058be] transition-colors"
                          >
                            {job.job_title}
                          </Link>
                          <div className="text-[11px] text-[#535862] mt-0.5">
                            {job.company_name} • {job.location || 'Remote'}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#414651] font-medium">
                          {job.category_name || 'General'}
                        </td>

                        <td className="py-4 px-4 text-[#717680]">
                          {job.published_at
                            ? new Date(job.published_at).toLocaleDateString()
                            : new Date(job.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles}`}>
                            {job.job_status === 'published' ? 'Active' : job.job_status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {job.reports_count > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#fce8e6] text-[#c5221f] text-[10px] font-bold flex items-center gap-1 w-max">
                              <ShieldAlert className="w-3 h-3" />
                              <span>{job.reports_count} Flagged</span>
                            </span>
                          ) : (
                            <span className="text-[#717680] text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right relative">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/admin/jobs/${job.id}`}
                              className="p-1.5 rounded-lg text-[#717680] hover:text-[#0058be] hover:bg-[#e8f0fe] transition-colors"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleFlagJob(job.id)}
                              className="p-1.5 rounded-lg text-[#717680] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                              title="Flag for Review"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setStatusMenuOpenId(isMenuOpen ? null : job.id)}
                              className="p-1.5 rounded-lg text-[#717680] hover:text-[#191c1e] hover:bg-[#f0f2f5] transition-colors cursor-pointer"
                              title="Manage Status"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {isMenuOpen && (
                            <div className="absolute right-4 top-12 z-30 w-44 bg-white border border-[#e5e8ec] rounded-2xl shadow-xl p-1.5 space-y-1 text-left">
                              {job.job_status !== 'on_hold' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'on_hold', 'Administrative hold')}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#b06000] hover:bg-[#fff8e1] flex items-center gap-2 cursor-pointer"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Place on Hold</span>
                                </button>
                              )}

                              {job.job_status !== 'published' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'published')}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#137333] hover:bg-[#e6f4ea] flex items-center gap-2 cursor-pointer"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Publish / Activate</span>
                                </button>
                              )}

                              {job.job_status !== 'closed' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'closed')}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#c5221f] hover:bg-[#fce8e6] flex items-center gap-2 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Close Listing</span>
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
        {totalCount > 15 && (
          <div className="pt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={15}
              onPageChange={(p) => fetchAdminJobs(p)}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

