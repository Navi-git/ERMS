import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { User, LogOut, Briefcase } from 'lucide-react';
import { logout } from '../store/slices/authSlice';

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

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
                to="/dashboard"
                className="flex items-center gap-2 text-sm font-semibold text-[#191c1e] hover:text-[#0058be] px-3 py-1.5 rounded-md hover:bg-[#eceef0] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0058be]/10 text-[#0058be] flex items-center justify-center font-semibold text-xs">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline">
                  {user?.full_name || 'My Dashboard'}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-[#45464d] hover:text-[#ba1a1a] rounded-md hover:bg-[#ffdad6]/40 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#191c1e] hover:text-[#0058be] px-3.5 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-[#0058be] hover:bg-[#0047a0] px-4 py-2 rounded-[4px] shadow-sm transition-all hover:shadow active:scale-[0.98]"
              >
                Register
              </Link>
              <Link
                to="/login?role=candidate"
                className="w-9 h-9 rounded-full bg-[#000000] text-white flex items-center justify-center hover:bg-[#1f2937] transition-colors ml-1 shadow-sm"
                title="Candidate Portal"
              >
                <User className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
