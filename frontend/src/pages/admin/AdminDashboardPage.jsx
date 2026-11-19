import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  CheckSquare,
  Calendar,
  Award,
  Monitor,
  Eye,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserCheck,
  Loader2,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import adminApi from '../../api/adminApi';
import jobApi from '../../api/jobApi';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    // Fetch live stats, recent jobs, and recent registrations from backend
    const fetchDashboardData = async () => {
      try {
        const response = await adminApi.getStats();
        setStats(response.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }

      try {
        setLoadingJobs(true);
        const res = await jobApi.getAdminJobs({ page: 1, page_size: 4 });
        setRecentJobs(res.data?.results || []);
      } catch (err) {
        console.error('Failed to load recent jobs:', err);
      } finally {
        setLoadingJobs(false);
      }

      try {
        setLoadingUsers(true);
        const usersRes = await adminApi.getUsers({ page: 1, page_size: 4 });
        setRecentUsers(usersRes.data?.results || []);
      } catch (err) {
        console.error('Failed to load recent users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role) => {
    if (role === 'candidate') return 'Candidate';
    if (role === 'recruiter') return 'Recruiter';
    if (role === 'super_admin') return 'Super Admin';
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 11 KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* TOTAL USERS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">TOTAL USERS</span>
              <Users className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.total_users.toLocaleString() : '145.2K'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4% vs last month</span>
            </div>
          </div>

          {/* ACTIVE CANDIDATES */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE CANDIDATES</span>
              <UserCheck className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.active_candidates.toLocaleString() : '98.4K'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8.2% vs last month</span>
            </div>
          </div>

          {/* ACTIVE RECRUITERS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE RECRUITERS</span>
              <Users className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.active_recruiters.toLocaleString() : '12.1K'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+5.1% vs last month</span>
            </div>
          </div>

          {/* REGISTERED COMPANIES */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">REGISTERED COMPANIES</span>
              <Building2 className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.registered_companies.toLocaleString() : '8,421'}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4.7% vs last month</span>
            </div>
          </div>

          {/* PENDING VERIFICATIONS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">PENDING VERIFICATIONS</span>
              <CheckSquare className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">
              {stats ? stats.pending_verifications.toLocaleString() : '42'}
            </p>
            <div className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
              <span>+12 needs review</span>
            </div>
          </div>

          {/* ACTIVE JOBS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE JOBS</span>
              <Briefcase className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">32,105</p>
            <div className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>-1.2% vs last month</span>
            </div>
          </div>

          {/* TOTAL APPLICATIONS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">TOTAL APPLICATIONS</span>
              <Award className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">1.2M</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+15.3% vs last month</span>
            </div>
          </div>

          {/* INTERVIEWS SCHEDULED */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">INTERVIEWS SCHEDULED</span>
              <Calendar className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">4,502</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+9.4% vs last month</span>
            </div>
          </div>

          {/* HIRED CANDIDATES */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">HIRED CANDIDATES</span>
              <Award className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">14,200</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.5% YTD</span>
            </div>
          </div>

          {/* ACTIVE SUBSCRIPTIONS */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">ACTIVE SUBSCRIPTIONS</span>
              <Monitor className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">5,200</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4.2% vs last month</span>
            </div>
          </div>

          {/* PLATFORM MRR */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between text-[#717680] mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase">PLATFORM MRR</span>
              <Eye className="w-4 h-4 text-[#0058be]" />
            </div>
            <p className="text-2xl font-bold text-[#191c1e]">$2.4M</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8.1% vs last month</span>
            </div>
          </div>
        </div>

        {/* 3 Activity Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Recent Registrations */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#191c1e]">Recent Registrations</h3>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            {loadingUsers ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#0058be]" />
                <span className="text-xs">Loading recent registrations...</span>
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#717680]">
                No recent registrations found.
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => {
                  const roleLabel = getRoleLabel(user.role);
                  return (
                    <div
                      key={user.id}
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      className="flex items-center justify-between text-xs hover:bg-slate-50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {user.profile_picture_url ? (
                          <img
                            src={resolvePhotoUrl(user.profile_picture_url)}
                            alt={user.full_name || 'User'}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            user.role === 'recruiter' 
                              ? 'bg-purple-100 text-purple-700' 
                              : user.role === 'super_admin'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-[#d8e2ff] text-[#0058be]'
                          }`}>
                            {getInitials(user.full_name || user.email)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#191c1e] truncate group-hover:text-[#0058be] transition-colors">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-[11px] text-[#717680] truncate">
                            {roleLabel} • {user.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#8a8d94] shrink-0 ml-2">
                        {formatRelativeTime(user.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Recent Job Postings */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#191c1e]">Recent Job Postings</h3>
              <button
                onClick={() => navigate('/admin/jobs')}
                className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {loadingJobs ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#0058be]" />
                <span className="text-xs">Loading recent jobs...</span>
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#717680]">
                No recent job postings available.
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => {
                  const companyInfo = [job.company_name, job.location].filter(Boolean).join(' • ') || 'Independent';
                  return (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/admin/jobs/${job.id}`)}
                      className="flex items-center justify-between text-xs hover:bg-slate-50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#f2f4f7] text-[#717680] group-hover:text-[#0058be] group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#191c1e] truncate group-hover:text-[#0058be] transition-colors">
                            {job.job_title}
                          </p>
                          <p className="text-[11px] text-[#717680] truncate">{companyInfo}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#8a8d94] shrink-0 ml-2">
                        {formatRelativeTime(job.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Pending Actions */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ec] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#191c1e]">Pending Actions</h3>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                {stats?.pending_verifications !== undefined ? stats.pending_verifications : 3} Attention
              </span>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: CheckSquare,
                  color: 'text-amber-600 bg-amber-50',
                  title: 'Company Verification',
                  desc: 'Review pending company verification queue',
                  onClick: () => navigate('/admin/companies'),
                },
                {
                  icon: AlertCircle,
                  color: 'text-rose-600 bg-rose-50',
                  title: 'Flagged Job Posting',
                  desc: 'Review reported and flagged jobs',
                  onClick: () => navigate('/admin/jobs?status=reported'),
                },
                {
                  icon: Users,
                  color: 'text-[#0058be] bg-blue-50',
                  title: 'Admin Role Request',
                  desc: 'Manage administrative roles & permissions',
                  onClick: () => navigate('/admin/users'),
                },
              ].map((action, idx) => (
                <div
                  key={idx}
                  onClick={action.onClick}
                  className="flex items-center gap-3 text-xs hover:bg-slate-50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#191c1e] group-hover:text-[#0058be] transition-colors">
                      {action.title}
                    </p>
                    <p className="text-[11px] text-[#717680]">{action.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
