import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import adminApi from '../../api/adminApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/common/Pagination';

export default function AdminCompanyVerificationQueuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
  });
  const [industries, setIndustries] = useState([]);

  // Search & Filter state from URL params
  const search = searchParams.get('search') || '';
  const statusTab = searchParams.get('status') || 'ALL';
  const riskFilter = searchParams.get('risk_level') || 'ALL';
  const industryFilter = searchParams.get('industry') || 'ALL';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const [searchInput, setSearchInput] = useState(search);

  // Load industries for filter
  useEffect(() => {
    async function loadIndustries() {
      try {
        const res = await masterDataApi.getCategoryItems('industry');
        setIndustries(res.data || []);
      } catch (err) {
        // ignore
      }
    }
    loadIndustries();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (statusTab !== 'ALL') params.status = statusTab;
      if (riskFilter !== 'ALL') params.risk_level = riskFilter;
      if (industryFilter !== 'ALL') params.industry = industryFilter;

      const res = await adminApi.getCompanyQueue(params);
      setCompanies(res.data.results || []);
      setTotalCount(res.data.count || 0);
      if (res.data.stats) setStats(res.data.stats);
    } catch (err) {
      showToast('Failed to load company verification queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [search, statusTab, riskFilter, industryFilter, currentPage]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const statusTabs = [
    { key: 'ALL', label: 'All Companies', count: stats.total },
    { key: 'PENDING', label: 'Pending', count: stats.pending },
    { key: 'UNDER_REVIEW', label: 'Under Review', count: stats.under_review },
    { key: 'APPROVED', label: 'Approved', count: stats.approved },
    { key: 'REJECTED', label: 'Rejected', count: stats.rejected },
  ];

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header (Figma Page 9) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#191c1e] tracking-tight">
              Company Verification Queue
            </h1>
            <p className="text-xs text-[#71787e] mt-0.5">
              Review and approve companies registering on the platform. Monitor risk scores and ensure
              compliance before granting full access.
            </p>
          </div>
        </div>

        {/* Status Filter Tabs (Figma Page 9) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#e0e3e5]">
          {statusTabs.map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateParam('status', tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-[#0058be] text-white shadow-xs'
                    : 'bg-white text-[#41474d] hover:bg-[#f1f4f6] hover:text-[#191c1e] border border-[#e0e3e5]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-[#f1f4f6] text-[#71787e]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#e0e3e5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#71787e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by company name, CRN, or Tax ID..."
              className="w-full pl-10 pr-4 py-2 bg-[#f7f9fb] border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-[#0058be] focus:bg-white"
            />
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Industry Filter */}
            <select
              value={industryFilter}
              onChange={(e) => updateParam('industry', e.target.value)}
              className="px-3 py-2 bg-[#f7f9fb] border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
            >
              <option value="ALL">All Industries</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.key}>
                  {ind.value}
                </option>
              ))}
            </select>

            {/* Risk Score Filter */}
            <select
              value={riskFilter}
              onChange={(e) => updateParam('risk_level', e.target.value)}
              className="px-3 py-2 bg-[#f7f9fb] border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
            >
              <option value="ALL">Risk Score: All</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>

            {/* Reset Filters */}
            {(search || statusTab !== 'ALL' || riskFilter !== 'ALL' || industryFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-[#71787e] hover:text-[#191c1e] hover:bg-[#f1f4f6] rounded-xl transition-colors cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Queue Table (Figma Page 9) */}
        <div className="bg-white rounded-2xl border border-[#e0e3e5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f7f9fb] text-[#71787e] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-6">Company Name</th>
                  <th className="py-3.5 px-6">Industry</th>
                  <th className="py-3.5 px-6">Submission Date</th>
                  <th className="py-3.5 px-6">Risk Score</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f4f6]">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-6">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#71787e]">
                      <Building2 className="w-10 h-10 mx-auto text-[#71787e] opacity-40 mb-2" />
                      <p className="font-semibold text-sm text-[#191c1e]">No companies found</p>
                      <p className="text-xs">No verification requests matched your filter parameters.</p>
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => {
                    const status = company.status;
                    const isPending = status === 'PENDING';
                    const isUnderReview = status === 'UNDER_REVIEW';
                    const isApproved = status === 'APPROVED';
                    const isRejected = status === 'REJECTED';

                    const riskLevel = company.risk_level || 'LOW';
                    const formattedDate = company.submission_date
                      ? new Date(company.submission_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr key={company.id} className="hover:bg-[#f7f9fb] transition-colors">
                        {/* Company Name & ID */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] text-[#0058be] font-bold text-xs flex items-center justify-center shrink-0">
                              {company.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[#191c1e] hover:text-[#0058be] cursor-pointer"
                                 onClick={() => navigate(`/admin/companies/${company.id}`)}>
                                {company.name}
                              </p>
                              <p className="text-[10px] text-[#71787e]">
                                ID: CMP-{company.id} • {company.registration_number || 'Pending CRN'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Industry */}
                        <td className="py-4 px-6 text-[#41474d]">
                          <span className="px-2.5 py-1 bg-[#f1f4f6] text-[#41474d] rounded-lg font-medium text-[11px]">
                            {company.industry?.value || 'General'}
                          </span>
                        </td>

                        {/* Submission Date */}
                        <td className="py-4 px-6 text-[#41474d]">{formattedDate}</td>

                        {/* Risk Score */}
                        <td className="py-4 px-6">
                          {riskLevel === 'LOW' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Low</span>
                            </span>
                          )}
                          {riskLevel === 'MEDIUM' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Med</span>
                            </span>
                          )}
                          {riskLevel === 'HIGH' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              <span>High</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>Pending</span>
                            </span>
                          )}
                          {isUnderReview && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0058be] text-[11px] font-semibold border border-blue-200">
                              <Clock className="w-3 h-3 text-[#0058be]" />
                              <span>Under Review</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/companies/${company.id}`)}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              isApproved
                                ? 'bg-[#f1f4f6] hover:bg-[#e0e3e5] text-[#191c1e]'
                                : isUnderReview
                                ? 'bg-[#0058be] hover:bg-[#004ca5] text-white'
                                : 'bg-[#191c1e] hover:bg-black text-white'
                            }`}
                          >
                            <span>{isUnderReview ? 'Continue' : isApproved ? 'View' : 'Review'}</span>
                            <ArrowRight className="w-3 h-3" />
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
          {!loading && totalCount > pageSize && (
            <div className="border-t border-[#e0e3e5]">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={(p) => updateParam('page', p.toString())}
                itemName="companies"
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

