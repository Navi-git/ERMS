import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Search,
  Building2,
  MapPin,
  Briefcase,
  Users,
  CheckCircle2,
  ArrowRight,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import companyApi from '../../api/companyApi';
import Pagination from '../../components/common/Pagination';

export default function BrowseCompaniesPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [companies, setCompanies] = useState([]);
  const [featuredProfiles, setFeaturedProfiles] = useState([]);
  const [industryDistribution, setIndustryDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 9;

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedIndustries.length > 0) params.industry = selectedIndustries.join(',');
      if (selectedSizes.length > 0) params.company_size = selectedSizes.join(',');
      if (locationQuery.trim()) params.location = locationQuery.trim();

      const res = await companyApi.getPublicCompanies(params);
      const data = res.data;

      setCompanies(data.results || []);
      setTotalCount(data.count || (data.results ? data.results.length : 0));
      setTotalPages(Math.ceil((data.count || (data.results ? data.results.length : 0)) / pageSize) || 1);

      if (data.featured_profiles) setFeaturedProfiles(data.featured_profiles);
      if (data.industry_distribution) setIndustryDistribution(data.industry_distribution);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [currentPage, selectedIndustries, selectedSizes]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadCompanies();
  };

  const toggleIndustry = (key) => {
    setCurrentPage(1);
    setSelectedIndustries((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSize = (size) => {
    setCurrentPage(1);
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedIndustries([]);
    setSelectedSizes([]);
    setLocationQuery('');
    setCurrentPage(1);
    setTimeout(() => {
      loadCompanies();
    }, 0);
  };

  const Content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero / Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0058be]">
          <span>Directory</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Organizations</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191c1e] tracking-tight">
          Discover top organizations.
        </h1>
        <p className="text-sm sm:text-base text-[#41474d] max-w-2xl leading-relaxed">
          Explore curated profiles of industry leaders and innovative startups. Find the culture,
          values, and open roles that align with your next career milestone.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-3xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-[#71787e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name or keywords..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#c3c7cb] rounded-xl text-sm text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#0058be] hover:bg-[#004ca5] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Featured Profiles Section */}
      {featuredProfiles.length > 0 && currentPage === 1 && !searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-lg font-bold text-[#191c1e]">Featured Profiles</h2>
            </div>
            <span className="text-xs text-[#71787e]">Curated by TalentBridge</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredProfiles.map((company) => (
              <div
                key={`featured-${company.id}`}
                className="group relative bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                {/* Cover Image banner */}
                <div className="h-32 bg-linear-to-r from-slate-800 to-indigo-900 relative overflow-hidden">
                  {company.cover_image_url ? (
                    <img
                      src={company.cover_image_url}
                      alt={company.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-[#0058be] to-indigo-700 opacity-90" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                      {company.industry?.value || 'Technology'}
                    </span>
                    <span className="text-xs text-white/90">
                      {company.open_roles_count || 0} Open Roles
                    </span>
                  </div>
                </div>

                {/* Company Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#e0e3e5] shadow-xs flex items-center justify-center font-bold text-lg text-[#0058be] shrink-0 overflow-hidden -mt-8 relative z-10">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        company.name?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base text-[#191c1e] truncate group-hover:text-[#0058be] transition-colors">
                          {company.name}
                        </h3>
                        {company.verification_status === 'APPROVED' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#71787e] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{[company.city, company.state].filter(Boolean).join(', ') || 'Global'}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#41474d] line-clamp-2 leading-relaxed">
                    {company.description || 'Pioneering innovative solutions and empowering teams to build the future.'}
                  </p>

                  <div className="pt-2 border-t border-[#f1f4f6] flex items-center justify-between">
                    <span className="text-xs font-medium text-[#71787e]">
                      {company.company_size || 'Enterprise'}
                    </span>
                    <Link
                      to={`/companies/${company.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0058be] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout: Filters Sidebar + Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs h-fit">
          <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#191c1e]">
              <Filter className="w-4 h-4 text-[#0058be]" />
              <span>Filters</span>
            </div>
            {(selectedIndustries.length > 0 || selectedSizes.length > 0 || searchQuery || locationQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#0058be] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Industry Filter */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">
              Industry
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {industryDistribution.length > 0 ? (
                industryDistribution.map((ind) => {
                  const isChecked = selectedIndustries.includes(ind.key);
                  return (
                    <label
                      key={ind.key}
                      onClick={() => toggleIndustry(ind.key)}
                      className="flex items-center justify-between text-xs text-[#41474d] hover:text-[#191c1e] cursor-pointer py-1"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-[#c3c7cb] text-[#0058be] focus:ring-[#0058be]"
                        />
                        <span className="truncate">{ind.label}</span>
                      </div>
                      <span className="text-[11px] text-[#71787e] font-medium bg-[#f1f4f6] px-1.5 py-0.5 rounded-full">
                        {ind.count}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-xs text-[#71787e]">No industries available</p>
              )}
            </div>
          </div>

          {/* Company Size Filter */}
          <div className="space-y-3 pt-3 border-t border-[#f1f4f6]">
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">
              Company Size
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {['Startup', 'Mid-size', 'Enterprise'].map((size) => {
                const active = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0058be] text-white shadow-xs'
                        : 'bg-[#f1f4f6] text-[#41474d] hover:bg-[#e0e3e5]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Search */}
          <div className="space-y-3 pt-3 border-t border-[#f1f4f6]">
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">
              Location
            </h3>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#71787e] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCompanies()}
                placeholder="City or Region"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#c3c7cb] rounded-lg text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-[#0058be]"
              />
            </div>
          </div>
        </aside>

        {/* All Companies Grid */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#191c1e]">
              All Companies{' '}
              <span className="text-xs font-normal text-[#71787e]">({totalCount})</span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-xl border border-[#e0e3e5] animate-pulse p-5 space-y-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-[#71787e] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#191c1e]">No companies found</h3>
              <p className="text-xs text-[#71787e] max-w-sm mx-auto">
                No organizations matched your current search filters. Try adjusting your search keywords or resetting filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 bg-[#f1f4f6] hover:bg-[#e0e3e5] text-xs font-semibold text-[#191c1e] rounded-lg transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  to={`/companies/${company.id}`}
                  className="group bg-white rounded-xl border border-[#e0e3e5] p-5 shadow-xs hover:shadow-md hover:border-[#0058be]/40 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-lg bg-[#f7f9fb] border border-[#e0e3e5] flex items-center justify-center font-bold text-sm text-[#0058be] overflow-hidden">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                        ) : (
                          company.name?.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-[#0058be] bg-[#e8f0fe] px-2 py-0.5 rounded-full">
                        {company.industry?.value || 'Technology'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-sm text-[#191c1e] group-hover:text-[#0058be] transition-colors truncate">
                          {company.name}
                        </h3>
                        {company.verification_status === 'APPROVED' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#71787e] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{[company.city, company.state].filter(Boolean).join(', ') || 'Global'}</span>
                      </p>
                    </div>

                    <p className="text-xs text-[#41474d] line-clamp-2 leading-relaxed">
                      {company.description || 'Innovative organization building modern software and services.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[#f1f4f6] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-[#71787e]">
                      {company.open_roles_count || 0} Open Roles
                    </span>
                    <span className="w-7 h-7 rounded-full bg-[#f1f4f6] group-hover:bg-[#0058be] group-hover:text-white flex items-center justify-center text-[#71787e] transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalCount > pageSize && (
            <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden shadow-xs">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemName="companies"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );

  // If candidate is logged in, wrap in CandidateLayout; otherwise render public page with topbar
  if (user?.role === 'candidate') {
    return <CandidateLayout>{Content}</CandidateLayout>;
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {/* Public Guest Header */}
      <header className="h-16 bg-white border-b border-[#e0e3e5] sticky top-0 z-30 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-sm">
            TB
          </div>
          <span className="font-bold text-base tracking-tight text-[#191c1e]">
            Talent<span className="text-[#0058be]">Bridge</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-semibold text-[#0058be] hover:bg-[#e8f0fe] rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Create Account
          </Link>
        </div>
      </header>
      <div className="flex-1">{Content}</div>
    </div>
  );
}

