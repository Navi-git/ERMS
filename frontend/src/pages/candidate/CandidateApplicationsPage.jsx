import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import applicationApi from '../../api/applicationApi';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function CandidateApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs = [
    { key: 'all', label: 'All Applications' },
    { key: 'applied', label: 'Applied' },
    { key: 'reviewing', label: 'In Review' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer_sent', label: 'Offers' },
    { key: 'rejected', label: 'Rejected' },
  ];

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, searchQuery]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await applicationApi.getCandidateApplications(params);
      setApplications(res.data);
    } catch {
      // Ignore background load error
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0058be] border border-blue-200">
            APPLIED
          </span>
        );
      case 'reviewing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            IN REVIEW
          </span>
        );
      case 'shortlisted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            SHORTLISTED
          </span>
        );
      case 'interview_scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            INTERVIEW
          </span>
        );
      case 'offer_sent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            OFFER RECEIVED
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            HIRED
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#ba1a1a] border border-rose-200">
            REJECTED
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#71787e] border border-slate-200">
            WITHDRAWN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#71787e]">
            {status?.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <CandidateLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header (Figma Page 4) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0e3e5]">
          <div>
            <h1 className="text-2xl font-black text-[#191c1e] tracking-tight">
              My Applications
            </h1>
            <p className="text-xs text-[#71787e] mt-1">
              Track and manage your active job applications across all recruitment stages.
            </p>
          </div>

          <Link
            to="/jobs"
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Browse More Jobs</span>
          </Link>
        </div>

        {/* Search & Tabs Controls */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs (Figma Page 4) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-[#0058be] text-white shadow-xs'
                      : 'bg-white text-[#41474d] hover:bg-[#f1f4f6] border border-[#e0e3e5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-[#71787e] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applications..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Applications Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#e0e3e5]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
            <p className="text-xs text-[#71787e]">Loading your applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-16 bg-white rounded-3xl border border-[#e0e3e5] text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e]">No applications found</h3>
              <p className="text-xs text-[#71787e] max-w-sm mx-auto mt-1">
                {statusFilter !== 'all' || searchQuery
                  ? 'No applications match your current search or status filter.'
                  : "You haven't submitted any job applications yet. Discover matching job requisitions and apply directly."}
              </p>
            </div>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0058be] text-white text-xs font-bold hover:bg-[#004ca5] transition-colors"
            >
              <span>Explore Active Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          /* Table of Applications (Figma Page 4) */
          <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5] text-[#71787e] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-5">Role & Company</th>
                    <th className="py-3.5 px-5">Location / Type</th>
                    <th className="py-3.5 px-5">Applied On</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f6]">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/candidate/applications/${app.id}`)}
                      className="hover:bg-[#f7f9fb] transition-colors cursor-pointer group"
                    >
                      {/* Role & Company */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#f1f4f6] border border-[#e0e3e5] flex items-center justify-center overflow-hidden shrink-0 text-[#0058be] font-bold">
                            {app.company_logo ? (
                              <img
                                src={resolvePhotoUrl(app.company_logo)}
                                alt={app.company_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-[#71787e]" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#191c1e] group-hover:text-[#0058be] transition-colors block">
                              {app.job_title}
                            </span>
                            <span className="text-xs text-[#71787e]">
                              {app.company_name}
                              {app.department && ` • ${app.department}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location / Type */}
                      <td className="py-4 px-5 text-[#41474d]">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#191c1e]">
                            {app.location || 'Remote'}
                          </p>
                          <p className="text-[11px] text-[#71787e] capitalize">
                            {app.employment_type?.replace('_', ' ') || 'Full-time'}
                          </p>
                        </div>
                      </td>

                      {/* Applied On */}
                      <td className="py-4 px-5 text-[#41474d] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-[#71787e]" />
                          <span>{new Date(app.applied_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(app.application_status)}
                          {app.current_stage && (
                            <p className="text-[10px] text-[#71787e]">
                              Stage: <span className="font-semibold">{app.current_stage.name}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-[#0058be] group-hover:underline">
                          <span>View Details</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
    </CandidateLayout>
  );
}

