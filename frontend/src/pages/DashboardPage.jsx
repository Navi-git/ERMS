import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  User, Building2, Shield, LogOut, CheckCircle2, 
  Briefcase, Users, FileText, Bell, Sparkles, ArrowRight,
  TrendingUp, Star, Award, MapPin
} from 'lucide-react';
import authApi from '../api/authApi';
import { candidateApi } from '../api/candidateApi';
import { setUser, logout } from '../store/slices/authSlice';
import { resolvePhotoUrl } from '../utils/imageUrl';
import CandidateLayout from '../layouts/CandidateLayout';

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, refreshToken } = useSelector((state) => state.auth);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await authApi.getMe();
        dispatch(setUser(response.data));

        if (response.data?.role === 'candidate') {
          const profRes = await candidateApi.getProfile();
          setCandidateProfile(profRes.data);
        }
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

  const isCandidate = user?.role === 'candidate';
  const avatarUrl = resolvePhotoUrl(user?.profile_picture_url);
  const completeness = candidateProfile?.completeness || { percentage: 0, missing_sections: [] };
  const defaultResume = candidateProfile?.resumes?.find((r) => r.is_default && !r.archived_at);

  // If candidate, render within CandidateLayout
  if (isCandidate) {
    return (
      <CandidateLayout>
        <div className="space-y-6">
          {/* Welcome Card */}
          <div className="bg-white border border-[#e0e3e5] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0058be] text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.full_name?.charAt(0) || 'C'}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#191c1e]">
                    Welcome back, {user?.full_name?.split(' ')[0] || 'Candidate'}!
                  </h1>
                  {user?.is_email_verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#71787e] mt-0.5">
                  {candidateProfile?.headline || 'Setup your profile to begin matching with top tech roles.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/candidate/profile"
                className="px-4 py-2 rounded-xl bg-white border border-[#c3c7cb] hover:bg-slate-50 text-xs font-semibold text-[#191c1e] shadow-xs transition-colors"
              >
                View Profile
              </Link>
              <Link
                to="/candidate/resumes"
                className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Upload Resume
              </Link>
            </div>
          </div>

          {/* Completeness Card */}
          <div className="bg-white border border-[#e0e3e5] rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0058be]" />
                  <h3 className="font-bold text-sm text-[#191c1e]">Profile Completeness</h3>
                  <span className="text-xs font-bold text-[#0058be] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {completeness.percentage}%
                  </span>
                </div>
                <p className="text-xs text-[#71787e] mt-0.5">
                  Your profile visibility increases directly with profile completeness.
                </p>
              </div>

              <Link
                to="/candidate/profile"
                className="text-xs font-semibold text-[#0058be] hover:underline flex items-center gap-1"
              >
                Complete Profile
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-[#0058be] to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, completeness.percentage)}%` }}
              />
            </div>

            {completeness.missing_sections?.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs mt-3">
                {completeness.missing_sections.map((tip, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium"
                  >
                    + {tip}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e0e3e5] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Resumes Uploaded</span>
                <FileText className="w-4 h-4 text-[#0058be]" />
              </div>
              <div className="text-2xl font-bold text-[#191c1e] mt-2">
                {candidateProfile?.resumes?.length || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {defaultResume ? 'Primary resume active' : 'No primary resume set'}
              </p>
            </div>

            <div className="bg-white border border-[#e0e3e5] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Primary ATS Score</span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-[#191c1e] mt-2">
                {defaultResume?.ats_score ? `${defaultResume.ats_score}/100` : '—'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {defaultResume?.ats_score >= 75 ? 'Highly optimized for ATS' : 'Upload CV to analyze'}
              </p>
            </div>

            <div className="bg-white border border-[#e0e3e5] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Skills Verified</span>
                <Award className="w-4 h-4 text-[#0058be]" />
              </div>
              <div className="text-2xl font-bold text-[#191c1e] mt-2">
                {candidateProfile?.skills?.length || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Technical competencies
              </p>
            </div>

            <div className="bg-white border border-[#e0e3e5] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Work Experiences</span>
                <Briefcase className="w-4 h-4 text-[#0058be]" />
              </div>
              <div className="text-2xl font-bold text-[#191c1e] mt-2">
                {candidateProfile?.experiences?.length || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Employment records
              </p>
            </div>
          </div>
        </div>
      </CandidateLayout>
    );
  }

  // Recruiter Dashboard View
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
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
              Recruiter Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              className="flex items-center gap-2 text-xs font-semibold text-[#45464d] hover:text-[#0058be] px-3 py-1.5 rounded-md hover:bg-[#eceef0] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
                )}
              </div>
              <span className="hidden sm:inline">Account Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ba1a1a] bg-[#ffdad6]/40 hover:bg-[#ffdad6] px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden shadow-sm border-2 border-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.full_name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                <span>{user?.full_name?.charAt(0) || 'R'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#191c1e]">
                  {user?.full_name || 'Recruiter Portal'}
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
                <span className="capitalize font-medium text-[#191c1e]">Role: {user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f5]">
              <span className="text-xs font-bold text-[#45464d] uppercase tracking-wider">Active Job Posts</span>
              <Briefcase className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#191c1e]">0</div>
              <p className="text-xs text-[#76777d] mt-1">No active listings published.</p>
            </div>
          </div>
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f5]">
              <span className="text-xs font-bold text-[#45464d] uppercase tracking-wider">Candidate Pipeline</span>
              <Users className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#191c1e]">0</div>
              <p className="text-xs text-[#76777d] mt-1">Candidates in active screening.</p>
            </div>
          </div>
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f5]">
              <span className="text-xs font-bold text-[#45464d] uppercase tracking-wider">Interviews</span>
              <Sparkles className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#191c1e]">0</div>
              <p className="text-xs text-[#76777d] mt-1">Interviews scheduled this week.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
