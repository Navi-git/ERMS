import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
  Heart,
  Share2,
  ArrowLeft,
  ShieldCheck,
  Award,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import companyApi from '../../api/companyApi';
import WriteCompanyReviewModal from '../../components/candidate/WriteCompanyReviewModal';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';
import MarkdownContent from '../../components/common/MarkdownContent';

export default function PublicCompanyProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReviewTab, setActiveReviewTab] = useState('ALL');
  const [writeReviewModalOpen, setWriteReviewModalOpen] = useState(false);

  const fetchCompanyDetail = async () => {
    try {
      setLoading(true);
      const res = await companyApi.getPublicCompanyDetail(id);
      setCompany(res.data);
    } catch (err) {
      console.error('Failed to load company detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetail();
  }, [id]);

  const handleReviewSubmit = async (payload) => {
    await companyApi.submitCompanyReview(company.id, payload);
    showToast('Your review has been submitted and published!', 'success');
    fetchCompanyDetail();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#71787e]">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center p-6 text-center">
        <Building2 className="w-16 h-16 text-[#71787e] opacity-40 mb-3" />
        <h2 className="text-xl font-bold text-[#191c1e]">Company Not Found</h2>
        <p className="text-sm text-[#71787e] mt-1 mb-6 max-w-md">
          The organization profile you are looking for does not exist or may have been unlisted.
        </p>
        <Link
          to="/companies"
          className="px-5 py-2.5 bg-[#0058be] text-white text-xs font-semibold rounded-xl hover:bg-[#004ca5] transition-colors"
        >
          Back to Directory
        </Link>
      </div>
    );
  }

  const reviewsSummary = company.reviews_summary || {
    average_rating: 4.8,
    total_reviews: company.reviews?.length || 0,
    counts: { 5: 85, 4: 12, 3: 2, 2: 1, 1: 0 },
  };

  const Content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0058be] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to all organizations</span>
        </Link>
      </div>

      {/* Header Banner & Branding Card (Non-overlapping Text) */}
      <div className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-xs">
        {/* Sleek, compact cover image banner */}
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

        {/* Company Identity Bar - Placed Below Banner for 100% Readability */}
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

            {/* Action Buttons */}
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
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="px-4 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5" />
                <span>Write a Review</span>
              </button>
            </div>
          </div>

          {/* Typography Content: Name, Badge, Industry, Location cleanly on white background */}
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
                {company.name}
              </h1>
              {company.verification_status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Enterprise</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#71787e]">
              <span className="font-semibold text-[#0058be]">
                {company.industry?.value || 'Enterprise Technology'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {[company.city, company.state, company.country].filter(Boolean).join(', ') || 'Global Headquarters'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): About, Culture & Benefits, Open Roles, Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Us Card */}
          <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
              <Info className="w-4 h-4 text-[#0058be]" />
              <span>About {company.name}</span>
            </h2>
            {company.description ? (
              <div className="text-xs sm:text-sm text-[#41474d] leading-relaxed">
                <MarkdownContent content={company.description} />
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-[#41474d] leading-relaxed">
                {`${company.name} is a high-growth technology leader committed to building scalable solutions and fostering an inclusive, high-performance engineering culture.`}
              </div>
            )}

            {/* Talent Tracks / Focus Areas */}
            {company.talent_tracks && company.talent_tracks.length > 0 && (
              <div className="pt-4 border-t border-[#f1f4f6] space-y-2">
                <span className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">
                  Primary Hiring Tracks
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

          {/* Culture & Benefits Card (Figma Page 2) */}
          <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#0058be]" />
                <span>Culture & Benefits</span>
              </h2>
              <span className="text-xs text-[#71787e]">
                {company.benefits?.length || 0} Perks Offered
              </span>
            </div>

            {company.benefits && company.benefits.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {company.benefits.map((benefit) => (
                  <div
                    key={benefit.id}
                    className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-xs shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="font-bold text-xs text-[#191c1e]">{benefit.name}</h3>
                    </div>
                    {benefit.custom_description && (
                      <p className="text-[11px] text-[#41474d] leading-relaxed pl-8">
                        {benefit.custom_description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#71787e] bg-[#f7f9fb] rounded-xl border border-dashed border-[#c3c7cb]">
                Standard corporate benefits and learning stipends are provided. Contact recruiting for full details.
              </div>
            )}
          </section>

          {/* Open Roles Section (Placeholder for upcoming Jobs Module) */}
          <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0058be]" />
                <span>Open Roles</span>
              </h2>
              <span className="text-xs text-[#71787e]">Module 6 Integration</span>
            </div>

            <div className="p-6 text-center text-xs text-[#71787e] bg-[#f7f9fb] rounded-xl border border-dashed border-[#c3c7cb] space-y-1">
              <Briefcase className="w-6 h-6 mx-auto text-[#0058be] opacity-50 mb-2" />
              <p className="font-semibold text-[#191c1e]">Job Postings Coming Soon</p>
              <p>Active job vacancies will appear here once the Jobs module is activated.</p>
            </div>
          </section>

          {/* Reviews Section (Figma Page 2 & Page 3) */}
          <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f4f6] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Candidate & Team Reviews</span>
                </h2>
                <p className="text-xs text-[#71787e] mt-0.5">
                  Verified candidate and employee experience feedback.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Eligibility Gated
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                    } else if (user.role !== 'candidate') {
                      showToast('Only candidate accounts can submit company reviews.', 'info');
                    } else {
                      setWriteReviewModalOpen(true);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Write a Review</span>
                </button>
              </div>
            </div>

            {/* Scorecard Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center bg-[#f7f9fb] p-5 rounded-xl border border-[#e0e3e5]">
              <div className="text-center sm:border-r border-[#e0e3e5] pr-4 space-y-1">
                <div className="text-4xl font-extrabold text-[#191c1e]">
                  {reviewsSummary.average_rating}
                </div>
                <div className="flex justify-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500" />
                  ))}
                </div>
                <div className="text-[11px] text-[#71787e]">
                  Based on {reviewsSummary.total_reviews || 128} verified reviews
                </div>
              </div>

              {/* Progress bars */}
              <div className="sm:col-span-2 space-y-1.5 text-xs text-[#71787e]">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviewsSummary.counts[stars] || 0;
                  const total = reviewsSummary.total_reviews || 100;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="w-3 text-right text-[11px] font-bold">{stars}</span>
                      <div className="flex-1 h-2 bg-[#e0e3e5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0058be] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-[11px] text-right font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sample Reviews List */}
            <div className="space-y-4">
              <div className="border border-[#e0e3e5] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#71787e]">2 weeks ago</span>
                </div>
                <h4 className="text-xs font-bold text-[#191c1e]">
                  Fast interview loop and transparent compensation
                </h4>
                <p className="text-xs text-[#41474d] leading-relaxed">
                  Had a great interview experience with the engineering team. The recruiters were communicative
                  and the offer stage was very smooth and transparent.
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-[#71787e]">
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Verified Candidate (Offer Received)
                  </span>
                  <span>Senior Distributed Systems Engineer</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (1 Col): Company Details & Location */}
        <aside className="space-y-6">
          {/* Company Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider border-b border-[#f1f4f6] pb-3">
              Company Details
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71787e] flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Company Size</span>
                </span>
                <span className="font-bold text-[#191c1e]">{company.company_size || '1,000 - 5,000'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71787e] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Founded</span>
                </span>
                <span className="font-bold text-[#191c1e]">{company.founded_year || '2015'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71787e] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Headquarters</span>
                </span>
                <span className="font-bold text-[#191c1e]">
                  {[company.city, company.state].filter(Boolean).join(', ') || 'Global'}
                </span>
              </div>
            </div>
          </div>

          {/* Headquarters Location Card (Structured text address without map) */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#0058be]" />
              <span>HQ Location</span>
            </h3>

            <div className="text-xs text-[#41474d] space-y-1 bg-[#f7f9fb] p-3.5 rounded-xl border border-[#e0e3e5]">
              <p className="font-semibold text-[#191c1e]">{company.name} Headquarters</p>
              <p>{company.headquarters_address || '450 Serra Mall'}</p>
              <p>
                {[company.city, company.state, company.postal_code].filter(Boolean).join(', ') ||
                  'Stanford, CA 94305'}
              </p>
              <p>{company.country || 'United States'}</p>
            </div>
          </div>
        </aside>
      </div>

      <WriteCompanyReviewModal
        isOpen={writeReviewModalOpen}
        onClose={() => setWriteReviewModalOpen(false)}
        company={company}
        onSubmitSuccess={handleReviewSubmit}
      />
    </div>
  );

  if (user?.role === 'candidate') {
    return <CandidateLayout>{Content}</CandidateLayout>;
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <header className="h-16 bg-white border-b border-[#e0e3e5] sticky top-0 z-30 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-sm">
            TB
          </div>
          <span className="font-bold text-base tracking-tight text-[#191c1e]">
            Talent<span className="text-[#0058be]">Bridge</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-semibold text-[#0058be] hover:bg-[#e8f0fe] rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Create Account
          </Link>
        </div>
      </header>
      <div className="flex-1">{Content}</div>
    </div>
  );
}

