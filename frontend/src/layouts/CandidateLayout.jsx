import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  Bookmark,
  Building2,
  Bell,
  Settings,
  LogOut,
  Search,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import authApi from '../api/authApi';
import { logout } from '../store/slices/authSlice';
import { resolvePhotoUrl } from '../utils/imageUrl';

export default function CandidateLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Companies', icon: Building2, path: '/companies' },
    { name: 'My Profile', icon: User, path: '/candidate/profile' },
    { name: 'Resumes & ATS', icon: FileText, path: '/candidate/resumes' },
    { name: 'Applications', icon: Briefcase, path: '/candidate/applications' },
    { name: 'Saved Jobs', icon: Bookmark, path: '/candidate/saved-jobs' },
  ];

  const avatarUrl = resolvePhotoUrl(user?.profile_picture_url);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-row">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e0e3e5] flex flex-col fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center border-b border-[#e0e3e5]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-[#004ca5] transition-colors">
              TB
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#191c1e] leading-tight">
                Talent<span className="text-[#0058be]">Bridge</span>
              </span>
              <span className="text-[10px] font-medium text-[#71787e] tracking-wider uppercase">
                Candidate Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
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
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-[#0058be]' : 'text-[#71787e]'}`}
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="p-3 border-t border-[#e0e3e5] space-y-1">
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/settings'
                ? 'bg-[#e8f0fe] text-[#0058be] font-semibold'
                : 'text-[#41474d] hover:bg-[#f1f4f6] hover:text-[#191c1e]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#71787e]" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-650 hover:bg-red-50 text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#e0e3e5] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#71787e] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search jobs, skills, companies..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#f1f4f6] border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-[#0058be] text-[#191c1e] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              title="Notifications"
              className="p-2 text-[#71787e] hover:text-[#191c1e] hover:bg-[#f1f4f6] rounded-full transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-[#0058be] rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>

            {/* Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#f1f4f6] transition-colors"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.full_name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0058be]/10 text-[#0058be] flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
                    {user?.full_name?.charAt(0) || 'C'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-[#191c1e] leading-tight">
                    {user?.full_name || 'Candidate'}
                  </p>
                  <p className="text-[10px] text-[#71787e] capitalize">
                    {user?.role || 'Candidate'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#71787e]" />
              </button>

              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white border border-[#e0e3e5] rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <Link
                    to="/candidate/profile"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#191c1e] hover:bg-[#f1f4f6]"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-[#71787e]" />
                    My Profile
                  </Link>
                  <Link
                    to="/candidate/resumes"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#191c1e] hover:bg-[#f1f4f6]"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#71787e]" />
                    Resumes & ATS
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#191c1e] hover:bg-[#f1f4f6]"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <Settings className="w-3.5 h-3.5 text-[#71787e]" />
                    Account Settings
                  </Link>
                  <div className="border-t border-[#e0e3e5] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

