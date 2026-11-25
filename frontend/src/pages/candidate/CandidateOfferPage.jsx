import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building,
  Heart,
  PiggyBank,
  Palmtree,
  Laptop,
  Briefcase,
  Users,
  MessageSquare,
  Award,
  ChevronRight,
  ExternalLink,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';
import { offerApi } from '../../api/offerApi';
import { useToast } from '../../context/ToastContext';
import AcceptEmploymentOfferModal from '../../components/candidate/AcceptEmploymentOfferModal';
import DeclineOfferModal from '../../components/candidate/DeclineOfferModal';

export default function CandidateOfferPage() {
  const { id: appIdParam } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [appIdParam]);

  const loadOffer = async () => {
    try {
      setLoading(true);
      const res = await offerApi.getCandidateApplicationOffer(appIdParam);
      setOffer(res.data?.offer || null);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to load offer details.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!offer?.id) return;
    try {
      setSubmitting(true);
      const res = await offerApi.acceptOffer(offer.id);
      setOffer(res.data?.offer);
      setAcceptModalOpen(false);
      showToast('Congratulations! Offer accepted successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to accept offer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async ({ decline_reason, candidate_feedback }) => {
    if (!offer?.id) return;
    try {
      setSubmitting(true);
      const res = await offerApi.declineOffer(offer.id, {
        decline_reason,
        candidate_feedback,
      });
      setOffer(res.data?.offer);
      setDeclineModalOpen(false);
      showToast('Offer declined. Thank you for your feedback.', 'info');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to decline offer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!offer?.id) return;
    try {
      setDownloading(true);
      const res = await offerApi.downloadOfferLetter(offer.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${offer.company_name}_Offer_Letter_${offer.offer_reference}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback to direct media url if available
      if (offer.offer_document_url) {
        window.open(offer.offer_document_url, '_blank');
      } else {
        showToast('Unable to download letter document.', 'error');
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#0058be] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading formal employment offer...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No Active Offer Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            There is currently no formal offer extended for this application. Once extended by the hiring team, your compensation package and letter will appear here.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/candidate/applications/${appIdParam}`)}
            className="w-full py-2.5 rounded-xl bg-[#0058be] text-white text-xs font-bold hover:bg-[#004ca5] transition-colors"
          >
            Back to Application
          </button>
        </div>
      </div>
    );
  }

  const isPending = offer.status === 'sent';
  const isAccepted = offer.status === 'accepted';
  const isDeclined = offer.status === 'declined';
  const isExpired = offer.status === 'expired' || offer.is_expired;

  // Format dates
  const expirationStr = offer.expiration_date
    ? new Date(offer.expiration_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Upcoming';

  const startStr = offer.start_date
    ? new Date(offer.start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'To be determined';

  const salaryNum = offer.salary || 0;
  const targetTotalNum = offer.total_target_compensation || salaryNum;

  // Calculate days remaining
  let remainingDays = 0;
  if (offer.expiration_date) {
    const diff = new Date(offer.expiration_date) - new Date();
    remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const getRenderedOfferLetter = () => {
    if (!offer?.letter_content) return 'Official formal letter stipulations on record.';
    const text = offer.letter_content;
    if (!text.includes('{')) return text;

    const values = {
      candidate_name: offer.candidate_name || 'Candidate',
      candidate_email: offer.candidate_email || '',
      company_name: offer.company_name || 'Company',
      job_title: offer.job_title || 'Position',
      salary: offer.salary ? `$${offer.salary.toLocaleString()} ${offer.currency || 'USD'}` : 'N/A',
      currency: offer.currency || 'USD',
      pay_frequency: offer.pay_frequency?.replace(/_/g, ' ') || 'semi-monthly',
      start_date: startStr,
      expiration_date: expirationStr,
      hiring_manager: offer.reporting_manager_name || 'Hiring Manager',
      equity: offer.equity_units ? `${offer.equity_units.toLocaleString()} ${offer.equity_type || 'Units'} (${offer.equity_vesting_schedule || ''})` : 'N/A',
      bonus: offer.bonus_target_percent ? `${offer.bonus_target_percent}% target bonus` : 'Standard company incentive',
      sign_on_bonus: offer.sign_on_bonus ? `$${offer.sign_on_bonus.toLocaleString()} ${offer.currency || 'USD'}` : 'None',
      work_arrangement: offer.work_arrangement || 'Hybrid',
    };

    const aliasMap = {
      applicant_name: 'candidate_name',
      canidate_name: 'candidate_name',
      candidate: 'candidate_name',
      applicant: 'candidate_name',
      name: 'candidate_name',
      role: 'job_title',
      position: 'job_title',
      title: 'job_title',
      company: 'company_name',
      organization: 'company_name',
      manager: 'hiring_manager',
      manager_name: 'hiring_manager',
      reporting_manager: 'hiring_manager',
      expiry_date: 'expiration_date',
      valid_until: 'expiration_date',
      base_salary: 'salary',
      annual_salary: 'salary',
      compensation: 'salary',
      signing_bonus: 'sign_on_bonus',
      arrangement: 'work_arrangement',
      frequency: 'pay_frequency',
    };

    return text.replace(/\{([^{}]+)\}/g, (match, rawToken) => {
      const norm = rawToken.trim().toLowerCase().replace(/[\s-]+/g, '_');
      const key = aliasMap[norm] || norm;
      return values[key] !== undefined ? String(values[key]) : match;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-32">
      {/* Top Breadcrumb & Return Bar */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
            <Link to="/candidate/applications" className="hover:text-slate-900 transition-colors">
              Candidate Portal
            </Link>
            <span>/</span>
            <Link to="/candidate/applications" className="hover:text-slate-900 transition-colors">
              My Applications
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-semibold truncate">{offer.job_title}</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Offer Details</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/candidate/applications')}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Applications</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Hero Card (Figma Top Strip) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0058be] to-blue-700 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
              {offer.company_logo ? (
                <img
                  src={offer.company_logo}
                  alt=""
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                offer.company_name?.substring(0, 2).toUpperCase() || 'TG'
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{offer.job_title}</h1>
                {isAccepted ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Offer Accepted</span>
                  </span>
                ) : isDeclined ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Offer Declined</span>
                  </span>
                ) : isExpired ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Offer Expired</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Offer Received</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span>Received {offer.sent_at ? new Date(offer.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  {offer.company_name}
                  {offer.company_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#0058be]" />}
                </span>
                <span>•</span>
                <span>{offer.company_location}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">Ref: {offer.offer_reference}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>{downloading ? 'Downloading...' : 'Download Letter (.PDF)'}</span>
            </button>

            {isPending && (
              <button
                type="button"
                onClick={() => {
                  const elem = document.getElementById('response-actions');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Respond to Offer</span>
              </button>
            )}
          </div>
        </div>

        {/* Expiration Deadline Alert Banner */}
        {isPending && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Offer Expiration Deadline
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900">
                    {remainingDays > 0 ? `${remainingDays} Days Remaining` : 'Expires Today'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Please accept or decline this offer before <span className="font-bold">{expirationStr} (11:59 PM EST)</span>. If you need an extension, please contact your talent partner directly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast('Please contact your assigned talent partner for deadline adjustments.', 'info')}
              className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors shrink-0 shadow-2xs"
            >
              Request Extension
            </button>
          </div>
        )}

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sections A, B, C */}
          <div className="lg:col-span-8 space-y-8">
            {/* SECTION A • COMPENSATION & TERMS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0058be]">
                    SECTION A • COMPENSATION & TERMS
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Offer Compensation Package</h2>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0058be] border border-blue-200">
                  {offer.employment_type?.replace('_', ' ').toUpperCase() || 'FULL-TIME (W2)'}
                </span>
              </div>

              {/* Navy Hero Card */}
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#0b192c] via-[#0f284c] to-[#003884] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200/80">
                    ANNUAL BASE COMPENSATION
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight">
                      ${salaryNum.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-blue-200">/ year ({offer.currency || 'USD'})</span>
                  </div>
                  <p className="text-xs text-blue-200/90 mt-2 font-medium">
                    {offer.pay_frequency?.replace('_', ' ') || 'Semi-monthly'} payroll schedule (${offer.per_period_amount || (salaryNum / 24).toFixed(2)} gross before withholdings)
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-right shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                    Total Target Year 1
                  </span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    ${targetTotalNum.toLocaleString()}+
                  </span>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EQUITY GRANT</span>
                  <div className="text-base font-bold text-slate-900">
                    {offer.equity_units ? `${offer.equity_units.toLocaleString()} ${offer.equity_type || 'ISOs'}` : 'Equity Grant Eligible'}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {offer.equity_vesting_schedule || 'Standard 4-year vesting schedule with 1-year cliff.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PERFORMANCE BONUS</span>
                  <div className="text-base font-bold text-slate-900">
                    {offer.bonus_target_percent ? `${offer.bonus_target_percent}% Target` : 'Discretionary'}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Annual target bonus based on company performance and individual metrics.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SIGN-ON BONUS</span>
                  <div className="text-base font-bold text-slate-900">
                    {offer.sign_on_bonus ? `$${offer.sign_on_bonus.toLocaleString()}` : '$0'}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Payable in the first regular payroll cycle following official start date.
                  </p>
                </div>
              </div>

              {/* Key Employment Terms Grid */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Key Employment Terms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Employment Type</span>
                    <span className="font-bold text-slate-900 capitalize">
                      {offer.employment_type?.replace('_', ' ') || 'Full-time'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Proposed Start Date</span>
                    <span className="font-bold text-[#0058be]">{startStr}</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Work Arrangement</span>
                    <span className="font-bold text-slate-900 capitalize">{offer.work_arrangement || 'Hybrid'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Department / Team</span>
                    <span className="font-bold text-slate-900">{offer.department || 'Product Experience'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Reports To</span>
                    <span className="font-bold text-slate-900">
                      {offer.reporting_manager_name || 'Hiring Manager'}
                      {offer.reporting_manager_title ? `, ${offer.reporting_manager_title}` : ''}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Offer Expiration</span>
                    <span className="font-bold text-rose-600">{expirationStr} (11:59 PM EST)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION B • TOTAL REWARDS & PERKS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0058be]">
                    SECTION B • TOTAL REWARDS
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Comprehensive Benefits & Perks</h2>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Benefits guide download will be available in onboarding portal.', 'info')}
                  className="text-xs font-bold text-[#0058be] hover:underline"
                >
                  View 2024 Benefits Guide (PDF)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(offer.benefits || []).map((b, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#0058be] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {b.category === 'health' ? (
                        <Heart className="w-4 h-4 text-rose-500" />
                      ) : b.category === 'financial' ? (
                        <PiggyBank className="w-4 h-4 text-emerald-600" />
                      ) : b.category === 'pto' ? (
                        <Palmtree className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Laptop className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{b.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION C • OFFICIAL AGREEMENT & ATTACHMENTS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0058be]">
                    SECTION C • OFFICIAL AGREEMENT
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Official Offer Letter & Agreements</h2>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  PDF • Generated Official
                </span>
              </div>

              {/* Official Letter Item */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-14 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-rose-500 shrink-0">
                    <FileText className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase mt-0.5">PDF</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        {offer.company_name?.replace(/\s+/g, '_')}_Offer_Letter.pdf
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Official formal offer letter generated for {offer.job_title}. Contains complete remuneration schedule and terms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3.5 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Offer Letter (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    View Full Document Preview
                  </button>
                </div>
              </div>

              {/* Supplemental Attachments */}
              {offer.attachments && offer.attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">Supplemental Collateral</span>
                  {offer.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-[#0058be] shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{att.file_name}</span>
                      </div>
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Attachment</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Roadmap & Hiring Team */}
          <div className="lg:col-span-4 space-y-6">
            {/* Candidate Roadmap */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0058be]">
                  CANDIDATE ROADMAP
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">What Happens Next?</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0058be] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900">Review Terms & Benefits</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Carefully review compensation breakdown, equity vesting provisions, and benefits schedule.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0058be] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900">Submit Official Response</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Accept or decline this offer prior to {expirationStr} using the decision bar below.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0058be] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900">Onboarding & Equipment</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Upon acceptance, your welcome packet, background check link, and hardware selection portal unlock immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Points of Contact: Hiring Team */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0058be]">
                  POINTS OF CONTACT
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Your Hiring Team</h3>
              </div>

              <div className="space-y-3.5">
                {(offer.hiring_team || []).map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0058be]/10 text-[#0058be] font-bold flex items-center justify-center text-xs shrink-0">
                        {member.name?.substring(0, 2).toUpperCase() || 'TP'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{member.name}</h4>
                        <p className="text-[11px] text-slate-500">{member.role}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{member.notes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Response Bar */}
      {isPending && (
        <div
          id="response-actions"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 sm:px-8 py-4 shadow-xl"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Official Response Required by {expirationStr} (11:59 PM EST)
                </p>
                <p className="text-[11px] text-slate-500">
                  {offer.job_title} • {offer.company_name} • ${salaryNum.toLocaleString()} Base Salary
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeclineModalOpen(true)}
                className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Decline Offer
              </button>

              <button
                type="button"
                onClick={() => setAcceptModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept Offer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Full Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Employment Agreement</h3>
                <p className="text-xs text-slate-500">{offer.job_title} • {offer.company_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-serif leading-relaxed text-slate-800 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="font-sans flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="font-black text-sm uppercase text-[#0058be]">{offer.company_name}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Formal Offer</span>
              </div>
              <div className="font-sans text-[11px] text-slate-500 space-y-0.5">
                <p>Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p>Position: {offer.job_title}</p>
                <p>Ref: {offer.offer_reference}</p>
              </div>
              <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                {getRenderedOfferLetter()}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-[#0058be] text-white text-xs font-bold hover:bg-[#004ca5] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept & Decline Modals */}
      <AcceptEmploymentOfferModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        onConfirm={handleAccept}
        loading={submitting}
        offer={offer}
      />

      <DeclineOfferModal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        onConfirm={handleDecline}
        loading={submitting}
        companyName={offer.company_name}
      />
    </div>
  );
}
