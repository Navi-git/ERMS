import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  User, Building2, Shield, LogOut, CheckCircle2, 
  Briefcase, Users, FileText, Bell, Sparkles, ArrowRight
} from 'lucide-react';
import authApi from '../api/authApi';
import { setUser, logout } from '../store/slices/authSlice';

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, refreshToken } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await authApi.getMe();
        dispatch(setUser(response.data));
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout({ refresh: refreshToken });
      }
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      dispatch(logout());
      navigate('/');
    }
  };

  const isRecruiter = user?.role === 'recruiter';

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#e0e3e5] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <span>TB</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-[#191c1e]">
                Talent<span className="text-[#0058be]">Bridge</span>
              </span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e6e8ea] text-[#45464d] font-semibold uppercase tracking-wider hidden sm:inline">
              {isRecruiter ? 'Recruiter Console' : 'Candidate Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-semibold text-[#45464d] hover:text-[#0058be] px-3 py-1.5 rounded-md hover:bg-[#eceef0] transition-colors"
            >
              Public Home
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ba1a1a] bg-[#ffdad6]/40 hover:bg-[#ffdad6] px-3 py-1.5 rounded-[4px] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Welcome Banner */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0058be]/10 text-[#0058be] flex items-center justify-center font-bold text-2xl shrink-0">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#191c1e]">
                  {user?.full_name || 'Welcome!'}
                </h1>
                {user?.is_email_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-[#45464d] mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#76777d]">
                <span className="capitalize font-medium text-[#191c1e]">
                  Role: {user?.role || 'User'}
                </span>
                <span>•</span>
                <span>ID: #{user?.id || '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isRecruiter ? (
              <button className="bg-[#0058be] hover:bg-[#004bb0] text-white font-semibold text-xs px-4 py-2.5 rounded-[4px] shadow-sm transition-all flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                Post New Job
              </button>
            ) : (
              <button className="bg-[#0058be] hover:bg-[#004bb0] text-white font-semibold text-xs px-4 py-2.5 rounded-[4px] shadow-sm transition-all flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Update Career Profile
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <span className="text-xs font-semibold text-[#76777d] uppercase tracking-wider">
              {isRecruiter ? 'Open Positions' : 'Profile Status'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#191c1e]">
                {isRecruiter ? '4 Active' : '92%'}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {isRecruiter ? 'accepting applications' : 'complete'}
              </span>
            </div>
            <p className="text-xs text-[#45464d] mt-3">
              {isRecruiter
                ? 'Your company jobs are currently visible to top-tier verified talent.'
                : 'Complete your portfolio link to reach 100% visibility.'}
            </p>
          </div>

          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <span className="text-xs font-semibold text-[#76777d] uppercase tracking-wider">
              {isRecruiter ? 'Total Pipeline' : 'Application Inquiries'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0058be]">
                {isRecruiter ? '28' : '5'}
              </span>
              <span className="text-xs text-[#45464d]">in review</span>
            </div>
            <p className="text-xs text-[#45464d] mt-3">
              {isRecruiter
                ? '3 new candidates passed automated screening today.'
                : '2 enterprise recruiters viewed your profile this week.'}
            </p>
          </div>

          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <span className="text-xs font-semibold text-[#76777d] uppercase tracking-wider">
              Security & Verification
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">
                Active
              </span>
            </div>
            <p className="text-xs text-[#45464d] mt-3">
              Protected by multi-factor OTP verification and automated session refresh.
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}
