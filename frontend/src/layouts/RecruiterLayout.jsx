import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Users2,
  Briefcase,
  GitCommit,
  CalendarCheck2,
  Bell,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Lock,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import authApi from '../api/authApi';
import companyApi from '../api/companyApi';
import { logout } from '../store/slices/authSlice';
import { resolvePhotoUrl } from '../utils/imageUrl';

export default function RecruiterLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [company, setCompany] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadCompanyStatus() {
      try {
        const res = await companyApi.getRecruiterCompany();
        setCompany(res.data);
      } catch (err) {
        // If unauthenticated or network error, silently handle
      }
    }
    loadCompanyStatus();
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('erms_refresh_token');
      if (refreshToken) {
        await authApi.logout({ refresh: refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  const isVerified = company?.verification_status === 'APPROVED';
  const isPending = company?.verification_status === 'PENDING' || company?.verification_status === 'UNDER_REVIEW';

  // Exact navigation from Figma Page 4
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', requiresVerification: false },
    { name: 'Messages', icon: MessageSquare, path: '/recruiter/messages', requiresVerification: true },
    { name: 'Company Profile', icon: Building2, path: '/recruiter/company/profile', requiresVerification: false },
    { name: 'All Applicants', icon: Users2, path: '/recruiter/applicants', requiresVerification: true },
    { name: 'Job Postings', icon: Briefcase, path: '/recruiter/jobs', requiresVerification: true },
    { name: 'Hiring Timeline', icon: GitCommit, path: '/recruiter/timeline', requiresVerification: true },
    { name: 'Interviews', icon: CalendarCheck2, path: '/recruiter/interviews', requiresVerification: true },
    { name: 'Notifications', icon: Bell, path: '/recruiter/notifications', requiresVerification: false },
    { name: 'Company Analytics', icon: BarChart3, path: '/recruiter/analytics', requiresVerification: true },
  ];

  const accountItems = [
    { name: 'Subscription', icon: CreditCard, path: '/recruiter/subscription' },
    { name: 'Settings', icon: Settings, path: '/settings' },
    { name: 'Help Center', icon: HelpCircle, path: '/help' },
  ];

  const avatarUrl = resolvePhotoUrl(user?.profile_picture_url);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-row">
      {/* Sidebar (Figma Page 4) */}
      <aside className="w-64 bg-white border-r border-[#e0e3e5] flex flex-col fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center border-b border-[#e0e3e5]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-[#004ca5] transition-colors">
              TB
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#191c1e] leading-tight">
                Talent<span className="text-[#0058be]">Bridge</span>
              </span>
              <span className="text-[10px] font-medium text-[#71787e] tracking-wider uppercase">
                Recruiter Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#71787e]">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isLocked = item.requiresVerification && !isVerified;

            if (isLocked) {
              return (
                <div
                  key={item.name}
                  title="Verification required to access this feature"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#71787e]/60 cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#71787e]/40" />
                    <span>{item.name}</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-[#71787e]/50" />
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#e8f0fe] text-[#0058be] font-semibold'
                    : 'text-[#41474d] hover:bg-[#f1f4f6] hover:text-[#191c1e]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0058be]' : 'text-[#71787e]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#71787e]">
            Account
          </div>
          {accountItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#e8f0fe] text-[#0058be] font-semibold'
                    : 'text-[#41474d] hover:bg-[#f1f4f6] hover:text-[#191c1e]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0058be]' : 'text-[#71787e]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom User Profile Card */}
        <div className="p-3 border-t border-[#e0e3e5]">
          <div className="p-2 rounded-xl bg-[#f7f9fb] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.full_name} className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.slice(0, 2).toUpperCase() || 'RC'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#191c1e] truncate">
                  {user?.full_name || 'Lead Recruiter'}
                </p>
                <p className="text-[10px] text-[#71787e] truncate">
                  {company?.name || 'Recruiting Team'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-[#71787e] hover:text-red-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 min-w-0">
        {/* Verification Alert Banner (Figma Page 8 & Page 9) */}
        {!isVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              {isPending ? (
                <>
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Verification Under Review:</strong> Your compliance documents are being audited
                    by our team. Estimated turnaround: 24-48 hours.
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Account in Limited Mode:</strong> Complete your company profile and submit verification
                    to unlock job posting and candidate messaging.
                  </span>
                </>
              )}
            </div>

            <Link
              to="/recruiter/company/verify"
              className="inline-flex items-center gap-1 font-bold text-[#0058be] hover:underline shrink-0 ml-4"
            >
              <span>{isPending ? 'View Status' : 'Complete Verification'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Content body */}
        <main className="flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}

