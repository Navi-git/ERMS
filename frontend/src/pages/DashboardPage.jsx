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
import RecruiterLayout from '../layouts/RecruiterLayout';

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

  // Recruiter Dashboard View (Figma Page 4)
  return (
    <RecruiterLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header / Company Overview (Figma Page 4) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
              Company Overview
            </h1>
            <p className="text-xs text-[#71787e] mt-0.5">
              Monitor your recruiting performance and pipeline health.
            </p>
          </div>

          <Link
            to="/recruiter/company/profile"
            className="px-5 py-2.5 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>+ Post a New Job</span>
          </Link>
        </div>

        {/* 4 Metric Cards (Figma Page 4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Jobs */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#71787e]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Jobs</span>
              <Briefcase className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#191c1e]">0</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                +0%
              </span>
            </div>
            <p className="text-[11px] text-[#71787e]">Published live listings</p>
          </div>

          {/* Total Applications */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#71787e]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Applications</span>
              <Users className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#191c1e]">0</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                +0%
              </span>
            </div>
            <p className="text-[11px] text-[#71787e]">Candidate submissions received</p>
          </div>

          {/* Interviews Scheduled */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#71787e]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Interviews Scheduled</span>
              <Sparkles className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#191c1e]">0</span>
              <span className="text-[11px] font-semibold text-[#71787e] bg-slate-50 px-1.5 py-0.5 rounded">
                -0%
              </span>
            </div>
            <p className="text-[11px] text-[#71787e]">Scheduled this month</p>
          </div>

          {/* Avg Time to Hire */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#71787e]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Avg Time to Hire</span>
              <TrendingUp className="w-4 h-4 text-[#0058be]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#191c1e]">18</span>
              <span className="text-xs text-[#71787e]">days</span>
            </div>
            <p className="text-[11px] text-[#71787e]">Benchmark performance</p>
          </div>
        </div>

        {/* Hiring Pipeline Stepper (Figma Page 4) */}
        <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
              Hiring Pipeline
            </h2>
            <Link to="/recruiter/company/profile" className="text-xs text-[#0058be] font-semibold hover:underline">
              View Details
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {[
              { step: '1', title: 'Applied', count: '0' },
              { step: '2', title: 'Screened', count: '0' },
              { step: '3', title: 'Interview', count: '0' },
              { step: '4', title: 'Offer', count: '0' },
              { step: '5', title: 'Hired', count: '0' },
            ].map((p, idx) => (
              <div key={idx} className="p-3.5 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl text-center space-y-1">
                <span className="w-5 h-5 rounded-full bg-[#0058be] text-white text-[10px] font-bold inline-flex items-center justify-center mx-auto">
                  {p.step}
                </span>
                <p className="text-xs font-semibold text-[#41474d]">{p.title}</p>
                <p className="text-lg font-extrabold text-[#191c1e]">{p.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2 Columns: Active Job Roles & Recent Activity (Figma Page 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Job Roles (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
              <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                Active Job Roles
              </h2>
              <span className="text-xs text-[#71787e]">Module 6 Jobs</span>
            </div>

            <div className="p-8 text-center text-xs text-[#71787e] bg-[#f7f9fb] rounded-xl border border-dashed border-[#c3c7cb] space-y-2">
              <Briefcase className="w-8 h-8 text-[#0058be] opacity-40 mx-auto" />
              <p className="font-bold text-[#191c1e]">No Job Postings Yet</p>
              <p>Complete your company verification to post and publish live job openings.</p>
              <Link
                to="/recruiter/company/profile"
                className="inline-block mt-1 px-4 py-1.5 bg-[#0058be] text-white text-xs font-semibold rounded-lg hover:bg-[#004ca5] transition-colors"
              >
                Go to Company Profile
              </Link>
            </div>
          </div>

          {/* Recent Activity (1 Col) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider border-b border-[#f1f4f6] pb-3">
              Recent Activity
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl space-y-1">
                <p className="font-bold text-[#191c1e]">Company Profile Ready</p>
                <p className="text-[#71787e] text-[11px]">
                  Organization portal and verification flow configured.
                </p>
                <span className="text-[10px] text-[#71787e] block">Just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}
