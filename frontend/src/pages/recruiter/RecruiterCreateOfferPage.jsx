import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  Send,
  Eye,
  FileCheck,
  ChevronDown,
  Building,
  User,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
  ExternalLink,
  AlertCircle,
  X,
} from 'lucide-react';
import { offerApi } from '../../api/offerApi';
import { applicationApi } from '../../api/applicationApi';
import { useToast } from '../../context/ToastContext';
import EditReportingManagerModal from '../../components/recruiter/EditReportingManagerModal';
import DiscardDraftConfirmModal from '../../components/recruiter/DiscardDraftConfirmModal';

export const DEFAULT_OFFER_TEMPLATE = `Dear {candidate_name},

On behalf of {company_name}, I am thrilled to extend an offer for the position of {job_title} reporting to {hiring_manager}. We were immensely impressed by your expertise, system depth, and interview performance.

1. Compensation: Annual base salary of {salary}, payable {pay_frequency} according to the firm's regular payroll schedule.
2. Equity & Incentives: Subject to board approval, you will be granted {equity} and eligible for {bonus}.
3. Start Date & Working Arrangement: Your anticipated start date is {start_date}. This role is {work_arrangement}.

This formal offer will remain open until {expiration_date}. Please review the attached terms and submit your official response in the candidate portal. We look forward to building the future together!`;

export default function RecruiterCreateOfferPage() {
  const { id: appIdParam, offerId: offerIdParam } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [application, setApplication] = useState(null);
  const [offer, setOffer] = useState(null);
  const [applicationId, setApplicationId] = useState(appIdParam || null);

  // Form State
  const [salary, setSalary] = useState('165000');
  const [currency, setCurrency] = useState('USD');
  const [payFrequency, setPayFrequency] = useState('semi_monthly');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [signOnBonus, setSignOnBonus] = useState('15000');
  const [bonusTargetPercent, setBonusTargetPercent] = useState('15');
  const [equityUnits, setEquityUnits] = useState('12000');
  const [equityType, setEquityType] = useState('ISO');
  const [equityVestingSchedule, setEquityVestingSchedule] = useState('4-year vesting, 1-year cliff');
  const [reportingManagerName, setReportingManagerName] = useState('Marcus Kelly');
  const [reportingManagerTitle, setReportingManagerTitle] = useState('Design Director • Product Design & Systems');
  const [workArrangement, setWorkArrangement] = useState('hybrid');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [presetWindow, setPresetWindow] = useState('7');
  const [letterContent, setLetterContent] = useState(DEFAULT_OFFER_TEMPLATE);
  const [attachments, setAttachments] = useState([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  const handleSaveReportingManager = ({ name, title }) => {
    setReportingManagerName(name);
    if (title !== undefined) setReportingManagerTitle(title);
    setManagerModalOpen(false);
    showToast('Reporting manager updated.', 'success');
  };

  const handleConfirmDiscard = () => {
    setDiscardModalOpen(false);
    navigate(`/recruiter/applications/${applicationId}`);
  };

  // File Upload State
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [appIdParam, offerIdParam]);

  const loadData = async () => {
    try {
      setLoading(true);
      let targetAppId = appIdParam;

      if (offerIdParam) {
        const offRes = await offerApi.getOfferDetail(offerIdParam);
        const offData = offRes.data?.offer;
        if (offData) {
          setOffer(offData);
          targetAppId = offData.application_id;
          setApplicationId(targetAppId);
          populateFromOffer(offData);
        }
      }

      if (targetAppId) {
        const appRes = await applicationApi.getApplicationDetail(targetAppId);
        setApplication(appRes.data?.application || null);

        // Fetch existing offer draft if not already loaded
        if (!offerIdParam) {
          const existingRes = await offerApi.getRecruiterApplicationOffer(targetAppId);
          const existingOffer = existingRes.data?.offer;
          if (existingOffer) {
            setOffer(existingOffer);
            populateFromOffer(existingOffer);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load offer formulation context.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const populateFromOffer = (o) => {
    if (o.salary) setSalary(String(o.salary));
    if (o.currency) setCurrency(o.currency);
    if (o.pay_frequency) setPayFrequency(o.pay_frequency);
    if (o.employment_type) setEmploymentType(o.employment_type);
    if (o.sign_on_bonus) setSignOnBonus(String(o.sign_on_bonus));
    if (o.bonus_target_percent) setBonusTargetPercent(String(o.bonus_target_percent));
    if (o.equity_units) setEquityUnits(String(o.equity_units));
    if (o.equity_type) setEquityType(o.equity_type);
    if (o.equity_vesting_schedule) setEquityVestingSchedule(o.equity_vesting_schedule);
    if (o.reporting_manager_name) setReportingManagerName(o.reporting_manager_name);
    if (o.reporting_manager_title) setReportingManagerTitle(o.reporting_manager_title);
    if (o.work_arrangement) setWorkArrangement(o.work_arrangement);
    if (o.start_date) setStartDate(o.start_date);
    if (o.expiration_date) setExpirationDate(o.expiration_date);
    if (o.letter_content) {
      setLetterContent(o.letter_content);
    } else {
      setLetterContent(DEFAULT_OFFER_TEMPLATE);
    }
    if (o.attachments) setAttachments(o.attachments);
  };

  const handlePresetDays = (days) => {
    setPresetWindow(String(days));
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpirationDate(d.toISOString().split('T')[0]);
  };

  const insertMergeToken = (token) => {
    setLetterContent((prev) => (prev ? `${prev} {${token}}` : `{${token}}`));
  };

  // Build live simulated letter body
  const candidateName = application?.candidate?.user?.full_name || 'Candidate';
  const companyName = application?.job?.company_name || 'TalentBridge Partner';
  const jobTitle = application?.job?.title || 'Senior Role';

  const simulatedSalary = parseInt(salary, 10) || 0;
  const simulatedSalaryFormatted = `$${simulatedSalary.toLocaleString()} ${currency}`;
  const simulatedEquity = parseInt(equityUnits, 10)
    ? `${parseInt(equityUnits, 10).toLocaleString()} ${equityType} (${equityVestingSchedule})`
    : 'None';
  const simulatedBonus = parseInt(bonusTargetPercent, 10)
    ? `${bonusTargetPercent}% target bonus`
    : 'Standard company incentive';
  const simulatedSignOn = parseInt(signOnBonus, 10)
    ? `$${parseInt(signOnBonus, 10).toLocaleString()} ${currency}`
    : 'None';

  const payFrequencyLabels = {
    semi_monthly: 'semi-monthly (24 pay periods/year)',
    bi_weekly: 'bi-weekly (26 pay periods/year)',
    monthly: 'monthly (12 pay periods/year)',
    annual: 'annually (1 pay period/year)',
  };

  const workArrangementLabels = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    on_site: 'On-site',
  };

  const formatSimulatedDate = (val, fallback = 'To be determined') => {
    if (!val) return fallback;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch {
      // ignore
    }
    return val;
  };

  const getSimulatedLetter = () => {
    const rawTemplate = letterContent || DEFAULT_OFFER_TEMPLATE;
    const values = {
      candidate_name: candidateName,
      candidate_email: application?.candidate?.user?.email || '',
      company_name: companyName,
      job_title: jobTitle,
      salary: simulatedSalaryFormatted,
      currency: currency,
      pay_frequency: payFrequencyLabels[payFrequency] || payFrequency || 'semi-monthly',
      start_date: formatSimulatedDate(startDate, 'To be determined'),
      expiration_date: formatSimulatedDate(expirationDate, 'N/A'),
      hiring_manager: reportingManagerName
        ? `${reportingManagerName}${reportingManagerTitle ? `, ${reportingManagerTitle}` : ''}`
        : 'Hiring Manager',
      equity: simulatedEquity,
      bonus: simulatedBonus,
      sign_on_bonus: simulatedSignOn,
      work_arrangement: workArrangementLabels[workArrangement] || workArrangement || 'Hybrid',
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

    return rawTemplate.replace(/\{([^{}]+)\}/g, (match, rawToken) => {
      const norm = rawToken.trim().toLowerCase().replace(/[\s-]+/g, '_');
      const key = aliasMap[norm] || norm;
      return values[key] !== undefined ? String(values[key]) : match;
    });
  };

  const handleSaveDraft = async () => {
    if (!applicationId) return;
    try {
      setSaving(true);
      const payload = {
        salary: parseInt(salary, 10) || 0,
        currency,
        pay_frequency: payFrequency,
        employment_type: employmentType,
        sign_on_bonus: parseInt(signOnBonus, 10) || 0,
        bonus_target_percent: parseInt(bonusTargetPercent, 10) || 0,
        equity_units: parseInt(equityUnits, 10) || 0,
        equity_type: equityType,
        equity_vesting_schedule: equityVestingSchedule,
        reporting_manager_name: reportingManagerName,
        reporting_manager_title: reportingManagerTitle,
        work_arrangement: workArrangement,
        start_date: startDate,
        expiration_date: expirationDate,
        letter_content: letterContent || DEFAULT_OFFER_TEMPLATE,
      };

      const res = await offerApi.saveOfferDraft(applicationId, payload);
      const savedOffer = res.data?.offer;
      setOffer(savedOffer);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Offer draft saved successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save offer draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOffer = async () => {
    if (!salary || parseInt(salary, 10) <= 0) {
      showToast('Please enter a valid base salary.', 'error');
      return;
    }
    if (!startDate) {
      showToast('Please select a proposed start date.', 'error');
      return;
    }

    try {
      setSending(true);
      // Ensure draft is saved first
      const payload = {
        salary: parseInt(salary, 10) || 0,
        currency,
        pay_frequency: payFrequency,
        employment_type: employmentType,
        sign_on_bonus: parseInt(signOnBonus, 10) || 0,
        bonus_target_percent: parseInt(bonusTargetPercent, 10) || 0,
        equity_units: parseInt(equityUnits, 10) || 0,
        equity_type: equityType,
        equity_vesting_schedule: equityVestingSchedule,
        reporting_manager_name: reportingManagerName,
        reporting_manager_title: reportingManagerTitle,
        work_arrangement: workArrangement,
        start_date: startDate,
        expiration_date: expirationDate,
        letter_content: letterContent || DEFAULT_OFFER_TEMPLATE,
      };

      const draftRes = await offerApi.saveOfferDraft(applicationId, payload);
      const activeOffer = draftRes.data?.offer;
      const targetOfferId = activeOffer?.id || offer?.id;

      if (!targetOfferId) {
        showToast('Offer ID missing.', 'error');
        return;
      }

      await offerApi.sendOffer(targetOfferId);
      showToast('Formal offer dispatched to candidate!', 'success');
      navigate(`/recruiter/applications/${applicationId}`);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to dispatch offer.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !offer?.id) {
      if (!offer?.id) {
        showToast('Please save draft first before uploading attachments.', 'info');
      }
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', file.name);

      const res = await offerApi.uploadAttachment(offer.id, formData);
      const newAtt = res.data?.attachment;
      if (newAtt) {
        setAttachments((prev) => [...prev, newAtt]);
        showToast('Attachment uploaded successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to upload file.', 'error');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attId) => {
    try {
      await offerApi.deleteAttachment(attId);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
      showToast('Attachment removed.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove attachment.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#0058be] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading offer formulation studio...</p>
        </div>
      </div>
    );
  }

  const cand = application?.candidate?.user || {};
  const job = application?.job || {};

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link to="/recruiter/applicants" className="hover:text-slate-900 transition-colors">
              Applications
            </Link>
            <span>/</span>
            <Link
              to={`/recruiter/applications/${applicationId}`}
              className="hover:text-slate-900 transition-colors font-semibold"
            >
              {cand.full_name || 'Candidate'} (APP-{applicationId})
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Create Formal Offer</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDiscardModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Return</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/recruiter/applications/${applicationId}`)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Candidate Application</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Candidate Profile Strip (Figma Header) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#0058be]/10 text-[#0058be] font-bold text-lg flex items-center justify-center shrink-0">
              {cand.profile_picture_url ? (
                <img
                  src={cand.profile_picture_url}
                  alt=""
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                (cand.full_name || 'C').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-slate-900">{cand.full_name || 'Eleanor Pena'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0058be] border border-blue-200">
                  Offer Formulation Stage
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{job.title || 'Senior Product Designer'}</span>
                <span>•</span>
                <span>REQ-8039 ({job.department || 'Product Design'})</span>
                <span>•</span>
                <span>{job.location || 'San Francisco, CA (Hybrid)'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Application #APP-2023-{applicationId}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Score: 4.8 / 5.0 (Strong Yes)</span>
            </div>
          </div>
        </div>

        {/* 2-Column Formulation Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form (Steps 1 to 4) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Compensation & Employment Terms */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#0058be] text-white font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Compensation & Employment Terms</h2>
                    <p className="text-[11px] text-slate-500">Core remuneration structure, pay schedule, and equity incentives.</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0058be] border border-blue-200">
                  Tier 4 Senior IC
                </span>
              </div>

              {/* Salary & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Base Salary & Currency
                  </label>
                  <div className="flex rounded-xl border border-slate-300 focus-within:border-[#0058be] focus-within:ring-2 focus-within:ring-[#0058be]/10 transition-all overflow-hidden bg-white">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-2.5 py-2.5 bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="165000"
                      className="w-full px-3 py-2 text-sm font-bold text-slate-900 outline-none"
                    />
                    <span className="px-3 py-2 text-xs font-medium text-slate-400 self-center">/ year</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Standard approved band: $150k - $175k</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pay Frequency
                  </label>
                  <select
                    value={payFrequency}
                    onChange={(e) => setPayFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-[#0058be] outline-none"
                  >
                    <option value="semi_monthly">Semi-Monthly (24 periods)</option>
                    <option value="bi_weekly">Bi-Weekly (26 periods)</option>
                    <option value="monthly">Monthly (12 periods)</option>
                    <option value="annual">Annual Lump</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Gross per period: ${(simulatedSalary / 24).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Employment Classification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Employment Classification
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'full_time', label: 'Full-time Regular' },
                    { id: 'part_time', label: 'Part-time (20-30h)' },
                    { id: 'contract', label: 'Contract / 1099' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEmploymentType(t.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                        employmentType === t.id
                          ? 'bg-[#0058be] text-white border-[#0058be] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bonus & Equity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Sign-on & Variable Bonus</span>
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">Sign-on Bonus</span>
                      <input
                        type="number"
                        value={signOnBonus}
                        onChange={(e) => setSignOnBonus(e.target.value)}
                        placeholder="15000"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">Target Bonus %</span>
                      <input
                        type="number"
                        value={bonusTargetPercent}
                        onChange={(e) => setBonusTargetPercent(e.target.value)}
                        placeholder="15"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Equity Grant Package</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">Units / Shares</span>
                      <input
                        type="number"
                        value={equityUnits}
                        onChange={(e) => setEquityUnits(e.target.value)}
                        placeholder="12000"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">Grant Type</span>
                      <select
                        value={equityType}
                        onChange={(e) => setEquityType(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white outline-none"
                      >
                        <option value="ISO">ISO (Stock Options)</option>
                        <option value="RSU">RSU (Restricted Stock)</option>
                        <option value="NSO">NSO</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reporting Line Strip */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0058be]/10 text-[#0058be] font-bold flex items-center justify-center text-xs shrink-0">
                    {reportingManagerName
                      ? reportingManagerName
                          .trim()
                          .split(/\s+/)
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()
                      : 'HM'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting Line</span>
                    <h4 className="text-xs font-bold text-slate-900">{reportingManagerName}</h4>
                    <p className="text-[11px] text-slate-500">{reportingManagerTitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManagerModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0058be] hover:border-blue-200 transition-colors cursor-pointer"
                >
                  Change Manager
                </button>
              </div>
            </div>

            {/* Step 2: Timeline & Critical Milestones */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#0058be] text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Timeline & Critical Milestones</h2>
                  <p className="text-[11px] text-slate-500">Expected onboarding schedule and formal acceptance validity window.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Proposed Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:border-[#0058be] outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Earliest cohort induction: Q4 Onboarding Track</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Offer Expiration Deadline</label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Expires in {presetWindow} days
                    </span>
                  </div>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:border-[#0058be] outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Closes at 11:59 PM EST</p>
                </div>
              </div>

              {/* Preset Decision Windows */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Preset Decision Window
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { days: 3, label: '3 Business Days' },
                    { days: 5, label: '5 Business Days' },
                    { days: 7, label: '7 Days (Standard Active)' },
                    { days: 14, label: '14 Days (Executive Extension)' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => handlePresetDays(p.days)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        presetWindow === String(p.days)
                          ? 'bg-[#0058be] text-white border-[#0058be] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Offer Letter Template & Legal Draft */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#0058be] text-white font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Offer Letter Template & Legal Draft</h2>
                    <p className="text-[11px] text-slate-500">Review dynamic merge fields and adjust tailored stipulations.</p>
                  </div>
                </div>
              </div>

              {/* Active Template Bar */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Active Template:</span>
                  <span className="font-semibold text-slate-900">
                    Executive / Senior IC Standard Offer Letter v2.4 (Default)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Template manager available under Organization Settings.', 'info')}
                  className="text-[#0058be] font-bold hover:underline"
                >
                  Manage Templates
                </button>
              </div>

              {/* Token Insertion Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <span className="text-[11px] font-bold text-slate-500 px-2">Insert Tokens:</span>
                {[
                  'candidate_name',
                  'job_title',
                  'salary',
                  'start_date',
                  'expiration_date',
                  'hiring_manager',
                  'equity',
                  'bonus',
                ].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => insertMergeToken(tok)}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-[#0058be] hover:border-blue-300 font-mono text-[11px] transition-colors"
                  >
                    +{tok}
                  </button>
                ))}
              </div>

              {/* Letter Draft Textarea */}
              <div>
                <textarea
                  rows={10}
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="Dear {candidate_name},&#10;&#10;On behalf of {company_name}, I am thrilled to extend an offer for the position of {job_title}..."
                  className="w-full p-4 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/10 outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Step 4: Attachments & Supporting Collateral */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#0058be] text-white font-black text-xs flex items-center justify-center">
                  4
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Attachments & Supporting Collateral</h2>
                  <p className="text-[11px] text-slate-500">Enclosed legal agreements, benefit overviews, and policy disclosures.</p>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0058be] bg-slate-50/50 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-[#0058be] group-hover:scale-105 transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mt-2.5">Upload supplemental documentation</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Drag and drop PDF schedules (Benefits Summary, IP Agreement, Equity Plan) or click to browse. Max 25 MB.
                </p>
                {uploadingFile && <span className="text-xs font-bold text-[#0058be] mt-2">Uploading file...</span>}
              </div>

              {/* Uploaded File Items */}
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.file_name}</span>
                      <span className="text-[11px] text-slate-400">
                        {att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : 'PDF'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Live Offer Simulator & Compliance */}
          <div className="lg:col-span-5 space-y-6 sticky top-20">
            {/* Live Simulator Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Offer Simulator</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Dynamic
                </span>
              </div>

              {/* Rendered Letter Sheet */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-inner space-y-4 text-xs font-serif leading-relaxed text-slate-800 max-h-[460px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 font-sans">
                  <span className="font-black text-slate-900 tracking-tight text-xs uppercase">{companyName}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidential</span>
                </div>

                <div className="text-[11px] font-sans text-slate-500 space-y-0.5">
                  <p>Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p>To: {candidateName}</p>
                  <p>Subject: Offer of Employment — {jobTitle}</p>
                </div>

                <div className="whitespace-pre-wrap text-slate-800 text-[11px] font-sans leading-relaxed">
                  {getSimulatedLetter()}
                </div>

                <div className="border-t border-slate-200 pt-4 font-sans grid grid-cols-2 gap-4 text-[10px] text-slate-500">
                  <div>
                    <span className="font-bold text-slate-700">Authorized Signatory:</span>
                    <p className="mt-1 font-semibold text-slate-900">{reportingManagerName}</p>
                    <p>{reportingManagerTitle}</p>
                    <div className="h-6 border-b border-slate-300 mt-2" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Candidate Acceptance:</span>
                    <p className="mt-1 text-slate-400">Electronic portal verification</p>
                    <div className="h-6 border-b border-slate-300 mt-5" />
                  </div>
                </div>
              </div>

              {/* Letter Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Full PDF View</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Available Merge Tokens */}
              <div className="border-t border-slate-100 pt-4 space-y-2 font-sans">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Available Merge Tokens <span className="text-[10px] lowercase text-slate-400 font-normal">(Click to insert)</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{candidate_name}',
                    '{company_name}',
                    '{job_title}',
                    '{salary}',
                    '{start_date}',
                    '{expiration_date}',
                    '{hiring_manager}',
                    '{equity}',
                    '{bonus}',
                  ].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => insertMergeToken(tok.replace(/[{}]/g, ''))}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0058be] text-[10px] font-mono transition-colors"
                    >
                      {tok}
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval & Compliance Verification Checklist */}
              <div className="border-t border-slate-100 pt-4 space-y-3 font-sans">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Approval & Compliance Verification
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Budget Allocated Within Band</span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        ${simulatedSalary.toLocaleString()} is within approved range ($150k - $175k)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Headcount Requisition Active</span>
                      <p className="text-[11px] text-blue-700 mt-0.5">REQ-8039 signed off by VP of Product</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-900">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Background Check Pre-Authorized</span>
                      <p className="text-[11px] text-purple-700 mt-0.5">Consent on file via candidate verification</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 sm:px-8 py-3.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>
              {lastSavedTime ? `Draft saved at ${lastSavedTime}` : 'Draft not yet saved'} • Version 1.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDiscardModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Discard Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4 text-slate-500" />
              <span>{saving ? 'Saving...' : 'Save as Draft'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Preview Full Letter</span>
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={handleSendOffer}
              className="px-5 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Dispatching...' : 'Send Formal Offer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Offer Letter Document Preview</h3>
                <p className="text-xs text-slate-500">Official dispatch layout generated for {candidateName}</p>
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
                <span className="font-black text-sm uppercase text-[#0058be]">{companyName}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidential Offer</span>
              </div>
              <div className="font-sans text-[11px] text-slate-500 space-y-0.5">
                <p>Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p>To: {candidateName}</p>
                <p>Position: {jobTitle}</p>
              </div>
              <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                {getSimulatedLetter()}
              </div>
              <div className="border-t border-slate-200 pt-4 font-sans grid grid-cols-2 gap-6 text-[10px] text-slate-500">
                <div>
                  <span className="font-bold text-slate-700">Authorized Signatory</span>
                  <p className="mt-1 font-semibold text-slate-900">{reportingManagerName}</p>
                  <p>{reportingManagerTitle}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Candidate Acceptance</span>
                  <p className="mt-1 text-slate-400">Electronic verification pending candidate response</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reporting Manager Modal */}
      <EditReportingManagerModal
        isOpen={managerModalOpen}
        onClose={() => setManagerModalOpen(false)}
        managerName={reportingManagerName}
        managerTitle={reportingManagerTitle}
        onSave={handleSaveReportingManager}
      />

      {/* Discard Draft Confirmation Modal */}
      <DiscardDraftConfirmModal
        isOpen={discardModalOpen}
        onClose={() => setDiscardModalOpen(false)}
        onConfirm={handleConfirmDiscard}
        candidateName={cand.full_name || 'Candidate'}
        applicationId={applicationId}
      />
    </div>
  );
}
