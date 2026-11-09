import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Globe,
  Calendar,
  Users,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  Star,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  Heart,
  Plus,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import companyApi from '../../api/companyApi';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';
import MarkdownContent from '../../components/common/MarkdownContent';

export default function RecruiterCompanyProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const res = await companyApi.getRecruiterCompany();
      setCompany(res.data);
    } catch (err) {
      showToast('Failed to load company profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#71787e]">Loading company profile...</p>
          </div>
        </div>
      </RecruiterLayout>
    );
  }

  if (!company) {
    return (
      <RecruiterLayout>
        <div className="p-8 text-center space-y-4">
          <Building2 className="w-12 h-12 text-[#71787e] mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-[#191c1e]">No Company Found</h2>
          <p className="text-xs text-[#71787e]">Please set up your organization profile to continue.</p>
          <Link
            to="/recruiter/company/edit"
            className="inline-block px-4 py-2 bg-[#0058be] text-white text-xs font-semibold rounded-xl"
          >
            Create Company Profile
          </Link>
        </div>
      </RecruiterLayout>
    );
  }

  const isVerified = company.verification_status === 'APPROVED';
  const isPending = company.verification_status === 'PENDING' || company.verification_status === 'UNDER_REVIEW';

  return (
    <RecruiterLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner & Branding (Figma Page 5 - Non-overlapping Text) */}
        <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
          {/* Compact Banner */}
          <div className="h-36 sm:h-44 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
            {company.cover_image_url ? (
              <img
                src={resolvePhotoUrl(company.cover_image_url)}
                alt={company.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-r from-[#0058be] via-indigo-700 to-slate-900 opacity-90" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Company Identity Section - Text Placed Below Banner for 100% Readability */}
          <div className="px-6 pb-6 pt-0 relative bg-white">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              {/* Logo Anchored at Banner Edge */}
              <div className="-mt-12 sm:-mt-14 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-4 border-white shadow-md p-1 overflow-hidden shrink-0 z-10">
                {company.logo_url ? (
                  <img
                    src={resolvePhotoUrl(company.logo_url)}
                    alt={company.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-[#f1f4f6] flex items-center justify-center font-bold text-2xl text-[#0058be] rounded-xl">
                    {company.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Action Buttons Aligned Cleanly */}
              <div className="flex items-center gap-2 pt-2 sm:pt-4 self-start sm:self-auto">
                {company.website_url && (
                  <a
                    href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white border border-[#c3c7cb] hover:bg-slate-50 text-xs font-semibold text-[#191c1e] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#0058be]" />
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3 text-[#71787e]" />
                  </a>
                )}
                <Link
                  to="/recruiter/company/edit"
                  className="px-4 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </Link>
              </div>
            </div>

            {/* Typography Content: Company Name, Status Badge, Meta strictly on white background */}
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                  {company.name}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Enterprise</span>
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Under Review</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#71787e]">
                <span className="font-semibold text-[#0058be]">
                  {company.industry?.value || 'Industry Not Set'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[company.city, company.state, company.country].filter(Boolean).join(', ') || 'Headquarters Not Set'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Details View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Us */}
            <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#191c1e]">About Us</h2>
                <Link to="/recruiter/company/edit" className="text-xs text-[#0058be] hover:underline font-semibold">
                  Edit
                </Link>
              </div>
              {company.description ? (
                <div className="text-xs sm:text-sm text-[#41474d] leading-relaxed">
                  <MarkdownContent content={company.description} />
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-[#71787e] italic leading-relaxed">
                  No description added yet. Click "Edit Profile" to write a compelling overview of your company mission and vision.
                </div>
              )}

              {/* Talent Tracks / Hiring Areas */}
              {company.talent_tracks && company.talent_tracks.length > 0 && (
                <div className="pt-4 border-t border-[#f1f4f6] space-y-2">
                  <span className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">
                    Primary Functional Talent Tracks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {company.talent_tracks.map((track) => (
                      <span
                        key={track.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#e8f0fe] text-[#0058be]"
                      >
                        {track.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Culture & Benefits */}
            <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#0058be]" />
                  <span>Culture & Benefits</span>
                </h2>
                <Link
                  to="/recruiter/company/edit"
                  className="inline-flex items-center gap-1 text-xs text-[#0058be] font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Benefits</span>
                </Link>
              </div>

              {company.benefits && company.benefits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {company.benefits.map((benefit) => (
                    <div
                      key={benefit.id}
                      className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#0058be]" />
                        <h3 className="font-bold text-xs text-[#191c1e]">{benefit.name}</h3>
                      </div>
                      {benefit.custom_description && (
                        <p className="text-[11px] text-[#41474d] leading-relaxed pl-5">
                          {benefit.custom_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#71787e] bg-[#f7f9fb] rounded-xl border border-dashed border-[#c3c7cb]">
                  No perks added yet. Showcase your benefits to attract top talent.
                </div>
              )}
            </section>

            {/* Open Roles Preview */}
            <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0058be]" />
                  <span>Job Postings</span>
                </h2>
                <span className="text-xs text-[#71787e]">Module 6 Jobs</span>
              </div>
              <p className="text-xs text-[#71787e]">
                {isVerified
                  ? 'Your active job postings will be displayed here once posted.'
                  : 'Complete verification to start publishing live job openings.'}
              </p>
            </section>
          </div>

          {/* Sidebar (1 Col) */}
          <aside className="space-y-6">
            {/* Complete Verification Action Card (Figma Page 5) */}
            {!isVerified && (
              <div className="bg-linear-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm tracking-tight">Organization Verification</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Verify your business entity to remove job posting limits, unlock direct candidate reachouts,
                  and gain the verified enterprise badge.
                </p>
                <Link
                  to="/recruiter/company/verify"
                  className="block w-full py-2.5 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl text-center shadow-xs transition-colors"
                >
                  Complete Verification
                </Link>
              </div>
            )}

            {/* Company Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3.5 text-xs">
              <h3 className="font-bold text-[#191c1e] uppercase tracking-wider text-[11px] border-b border-[#f1f4f6] pb-2">
                Company Details
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-[#71787e] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Size</span>
                </span>
                <span className="font-bold text-[#191c1e]">{company.company_size || 'Not Specified'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71787e] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Founded</span>
                </span>
                <span className="font-bold text-[#191c1e]">{company.founded_year || 'Not Specified'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71787e] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Headquarters</span>
                </span>
                <span className="font-bold text-[#191c1e]">
                  {[company.city, company.state].filter(Boolean).join(', ') || 'Not Specified'}
                </span>
              </div>
            </div>

            {/* HQ Address (No map) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2 text-xs">
              <h3 className="font-bold text-[#191c1e] uppercase tracking-wider text-[11px]">
                Headquarters Address
              </h3>
              <div className="bg-[#f7f9fb] p-3 rounded-xl border border-[#e0e3e5] text-[#41474d] space-y-0.5">
                <p className="font-semibold text-[#191c1e]">{company.name}</p>
                <p>{company.headquarters_address || 'No street address provided'}</p>
                <p>
                  {[company.city, company.state, company.postal_code].filter(Boolean).join(', ') ||
                    'City, State, Postal'}
                </p>
                <p>{company.country || 'Country'}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </RecruiterLayout>
  );
}

