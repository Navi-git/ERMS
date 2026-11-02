import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { User, LogOut, Briefcase } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { resolvePhotoUrl } from '../utils/imageUrl';

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('erms_access_token');
    localStorage.removeItem('erms_refresh_token');
    localStorage.removeItem('erms_user');
    navigate('/');
  };

  const dashboardPath = user?.role === 'super_admin' ? '/admin/dashboard' : '/dashboard';
  const avatarUrl = resolvePhotoUrl(user?.profile_picture_url);

  return (
    <header className="sticky top-0 z-50 bg-[#f7f9fb]/90 backdrop-blur-md border-b border-[#e0e3e5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#0047a0] transition-colors">
            <span className="tracking-tighter">TB</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#191c1e]">
            Talent<span className="text-[#0058be]">Bridge</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#45464d]">
          <Link
            to="/jobs"
            className="hover:text-[#0058be] transition-colors py-1"
          >
            Find Jobs
          </Link>
          <Link
            to="/companies"
            className="hover:text-[#0058be] transition-colors py-1"
          >
            Companies
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to={dashboardPath}
                className="flex items-center gap-2 text-sm font-semibold text-[#191c1e] hover:text-[#0058be] px-3 py-1.5 rounded-md hover:bg-[#eceef0] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0058be] text-white flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <span className="hidden sm:inline">
                  {user?.full_name || (user?.role === 'super_admin' ? 'Admin Central' : 'My Dashboard')}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-[#45464d] hover:text-[#ba1a1a] rounded-md hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-[#45464d] hover:text-[#0058be] px-4 py-2 rounded-md hover:bg-[#eceef0] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-[#0058be] hover:bg-[#0047a0] px-4 py-2 rounded-md shadow-sm transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
