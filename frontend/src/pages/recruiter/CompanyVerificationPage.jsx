import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  FileCheck2,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  ArrowRight,
  ExternalLink,
  Info,
  ChevronRight,
  Sparkles,
  Download,
  AlertTriangle,
  Plus,
  X,
  Edit2,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import companyApi from '../../api/companyApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';

export default function CompanyVerificationPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Verification & Company State
  const [verification, setVerification] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [allTalentTracks, setAllTalentTracks] = useState([]);

  // Form Fields
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companySize, setCompanySize] = useState('51 - 200 employees');
  const [industryId, setIndustryId] = useState('');
  const [headquartersAddress, setHeadquartersAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');

  // Hiring Scope
  const [intendedHiringMin, setIntendedHiringMin] = useState(10);
  const [intendedHiringMax, setIntendedHiringMax] = useState(25);
  const [selectedTalentTrackIds, setSelectedTalentTrackIds] = useState([]);
  const [customTracks, setCustomTracks] = useState([]);
  const [trackSearch, setTrackSearch] = useState('');

  // Hidden File Input Refs
  const fileInputs = {
    incorporation: useRef(null),
    tax_form: useRef(null),
    business_license: useRef(null),
  };

  const getCurrentDraftPayload = () => ({
    name: name.trim(),
    registration_number: registrationNumber.trim(),
    tax_id: taxId.trim(),
    website_url: websiteUrl.trim(),
    company_size: companySize,
    industry_id: industryId ? parseInt(industryId, 10) : null,
    headquarters_address: headquartersAddress.trim(),
    city: city.trim(),
    state: stateRegion.trim(),
    country: country.trim(),
    postal_code: postalCode.trim(),
    intended_hiring_min: parseInt(intendedHiringMin, 10) || null,
    intended_hiring_max: parseInt(intendedHiringMax, 10) || null,
    talent_track_ids: [...selectedTalentTrackIds, ...customTracks],
  });

  const loadVerificationData = async ({ updateFormFields = true, showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const [vRes, indRes, trackRes] = await Promise.all([
        companyApi.getVerificationStatus(),
        masterDataApi.getCategoryItems('industry'),
        masterDataApi.getCategoryItems('talent_track'),
      ]);

      setVerification(vRes.data);
      setIndustries(indRes.data || []);
      setAllTalentTracks(trackRes.data || []);

      if (updateFormFields) {
        const comp = vRes.data.company_details;
        if (comp) {
          setName(comp.name || '');
          setWebsiteUrl(comp.website_url || '');
          setRegistrationNumber(comp.registration_number || '');
          setTaxId(comp.tax_id || '');
          setCompanySize(comp.company_size || '51 - 200 employees');
          setIndustryId(comp.industry?.id || '');
          setHeadquartersAddress(comp.headquarters_address || '');
          setCity(comp.city || '');
          setStateRegion(comp.state || '');
          setPostalCode(comp.postal_code || '');
          setCountry(comp.country || 'United States');
          if (comp.talent_tracks) {
            setSelectedTalentTrackIds(comp.talent_tracks.map((t) => t.id));
          }
        }

        if (vRes.data.intended_hiring_min) setIntendedHiringMin(vRes.data.intended_hiring_min);
        if (vRes.data.intended_hiring_max) setIntendedHiringMax(vRes.data.intended_hiring_max);
      }
    } catch (err) {
      showToast('Failed to load verification status.', 'error');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData({ updateFormFields: true, showLoader: true });
  }, []);

  const toggleTalentTrack = (id) => {
    setSelectedTalentTrackIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleAddTrack = (name) => {
    const trimmed = (name || trackSearch).trim();
    if (!trimmed) return;
    const matchCatalog = allTalentTracks.find(
      (t) => t.value.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchCatalog) {
      if (!selectedTalentTrackIds.includes(matchCatalog.id)) {
        setSelectedTalentTrackIds((prev) => [...prev, matchCatalog.id]);
      }
      setTrackSearch('');
      return;
    }
    if (customTracks.some((ct) => ct.toLowerCase() === trimmed.toLowerCase())) {
      setTrackSearch('');
      return;
    }
    setCustomTracks((prev) => [...prev, trimmed]);
    setTrackSearch('');
  };

  const removeCustomTrack = (trackName) => {
    setCustomTracks((prev) => prev.filter((t) => t !== trackName));
  };

  const filteredTracks = allTalentTracks.filter(
    (t) =>
      trackSearch &&
      t.value.toLowerCase().includes(trackSearch.toLowerCase()) &&
      !selectedTalentTrackIds.includes(t.id)
  );

  // Document Upload
  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    const allowedExts = ['pdf', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      showToast('Only PDF, PNG, and JPG documents are accepted.', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Document size exceeds 15 MB limit.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);

    try {
      setUploadingDocType(documentType);

      // Auto-save currently filled form fields as draft so uncommitted changes are preserved
      try {
        await companyApi.saveVerificationDraft(getCurrentDraftPayload());
      } catch (draftErr) {
        console.warn('Auto-save draft on upload warning:', draftErr);
      }

      await companyApi.uploadVerificationDocument(formData);
      showToast('Document uploaded and cryptographic checksum generated.', 'success');

      // Refresh documents and status WITHOUT full-screen reload and WITHOUT resetting form inputs
      await loadVerificationData({ updateFormFields: false, showLoader: false });
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to upload document.', 'error');
    } finally {
      setUploadingDocType(null);
    }
  };

  // Download Document
  const handleDownload = async (docId, filename) => {
    try {
      const res = await companyApi.downloadVerificationDocument(docId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Failed to download document.', 'error');
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      const payload = getCurrentDraftPayload();

      await companyApi.saveVerificationDraft(payload);
      showToast('Verification draft saved successfully.', 'success');
      // Update verification metadata without full-screen reload or overwriting form inputs
      await loadVerificationData({ updateFormFields: false, showLoader: false });
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to save draft.', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit for Review
  const handleSubmitForReview = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = getCurrentDraftPayload();

      await companyApi.submitVerification(payload);
      if (verification?.status === 'APPROVED' || verification?.status === 'REVERIFICATION') {
        showToast(
          'Updated verification submitted for compliance reverification! Your platform privileges remain active.',
          'success'
        );
        setIsEditing(false);
      } else {
        showToast('Verification submitted! Our compliance team will review your application.', 'success');
      }
      await loadVerificationData({ updateFormFields: true, showLoader: false });
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to submit verification.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#71787e]">Loading verification portal...</p>
          </div>
        </div>
      </RecruiterLayout>
    );
  }

  // Calculate readiness percentage
  const docs = verification?.documents || [];
  const hasIncorp = docs.some((d) => d.document_type === 'incorporation');
  const hasTax = docs.some((d) => d.document_type === 'tax_form');
  const hasLicense = docs.some((d) => d.document_type === 'business_license');
  const hasBasics = Boolean(registrationNumber && taxId && industryId && headquartersAddress);

  let readiness = 20;
  if (hasBasics) readiness += 30;
  if (hasIncorp) readiness += 25;
  if (hasTax) readiness += 15;
  if (hasLicense) readiness += 10;

  const status = verification?.status || 'DRAFT';
  const isApproved = status === 'APPROVED';
  const isReverification = status === 'REVERIFICATION';
  const isVerified = isApproved || isReverification;
  const isPending = status === 'PENDING' || status === 'UNDER_REVIEW';
  const isRejected = status === 'REJECTED';
  const isDraft = status === 'DRAFT';

  const isReadOnly = (isApproved || isPending) && !isEditing;
  if (isVerified) readiness = 100;

  return (
    <RecruiterLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Rejection Alert if previously rejected */}
        {isRejected && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-red-950">Verification Needs Revision</h4>
              <p>
                <strong>Reason provided by compliance:</strong>{' '}
                {verification.rejection_reason || 'Please provide clearer, updated corporate documentation.'}
              </p>
              <p className="text-red-700">
                You can replace the rejected documents below and re-submit your application for immediate audit.
              </p>
            </div>
          </div>
        )}

        {/* Reverification Active Notice */}
        {isReverification && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start justify-between gap-4 text-xs text-purple-950 flex-col sm:flex-row">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-purple-950">Compliance Reverification In Progress</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Active Verified Privileges
                  </span>
                </div>
                <p className="text-purple-900 leading-relaxed max-w-2xl">
                  Your updated corporate filings and documents have been submitted to compliance. Your organization remains
                  fully active: job postings, candidate pipelines, and verified enterprise privileges continue uninterrupted.
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Modify Submission</span>
              </button>
            )}
          </div>
        )}

        {/* Approved Status Notice with Edit Action */}
        {isApproved && !isEditing && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start sm:items-center justify-between gap-4 text-xs text-emerald-950 flex-col sm:flex-row">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-emerald-950">Organization Officially Verified</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Enterprise
                  </span>
                </div>
                <p className="text-emerald-800">
                  Your compliance documents and corporate filings are audited and approved. To update business details or replace filings, click Edit Verification Details.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Verification Details</span>
            </button>
          </div>
        )}

        {/* Editing Banner */}
        {isVerified && isEditing && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start justify-between gap-4 text-xs text-blue-950 flex-col sm:flex-row">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#0058be] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-blue-950">Editing Verification Details</h4>
                <p className="text-blue-800 leading-relaxed max-w-2xl">
                  You can update company information or replace compliance files. When submitted, updates enter
                  Compliance Reverification while your active platform privileges and job listings remain fully operational.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                loadVerificationData({ updateFormFields: true, showLoader: false });
              }}
              className="px-3.5 py-1.5 bg-white border border-[#c3c7cb] hover:bg-slate-50 text-xs font-semibold text-[#191c1e] rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Cancel Editing
            </button>
          </div>
        )}

        {/* Pending Review Notice */}
        {isPending && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-950">Application Under Review</h4>
              <p className="text-amber-800 leading-relaxed">
                Your initial verification application has been submitted and is currently being audited by our Trust &amp; Safety specialists. Review cycles typically take 24–48 business hours.
              </p>
            </div>
          </div>
        )}

        {/* Breadcrumb & Header (Figma Page 8) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#71787e] tracking-wider uppercase">
            <span>Onboarding</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Company Setup</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#0058be]" />
            <span className="text-[#0058be]">
              {isVerified ? 'Verification Details' : 'Organization Verification'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#191c1e] tracking-tight">
                {isVerified ? 'Organization Verification Details' : 'Verify Your Company'}
              </h1>
              <p className="text-xs sm:text-sm text-[#41474d] max-w-3xl leading-relaxed mt-1">
                {isVerified
                  ? 'Official corporate compliance records, legal verification status, and audited documents.'
                  : 'Official corporate verification establishes immediate trust with top-tier candidates and unlocks high-volume recruiting pipelines. Review cycles average 24 to 48 business hours.'}
              </p>
            </div>
            {isApproved && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}
          </div>
        </div>

        {/* Two-Column Form Layout */}
        <form onSubmit={handleSubmitForReview} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Verification Sections (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* PART 1 OF 3: Registered Corporate Entity Overview */}
            <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                    Registered Corporate Entity Overview
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#71787e]">Part 1 of 3</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Official Business Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Official Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nexus Dynamics LLC"
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                    required
                  />
                </div>

                {/* Official Web Domain */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Official Web Domain</label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="nexusdynamics.io"
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                  />
                </div>

                {/* Registration Number (CRN) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Registration Number (CRN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="CRN-9021849-B"
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                    required
                  />
                </div>

                {/* Federal Tax ID / EIN */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Federal Tax ID / EIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="EIN-84-9201948"
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                    required
                  />
                </div>

                {/* Company Size */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Company Size (Global headcount)</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                  >
                    <option value="1 - 10 employees">1 - 10 employees</option>
                    <option value="11 - 50 employees">11 - 50 employees</option>
                    <option value="51 - 200 employees">51 - 200 employees</option>
                    <option value="201 - 1000 employees">201 - 1,000 employees</option>
                    <option value="1000+ employees">1,000+ employees (Enterprise)</option>
                  </select>
                </div>

                {/* Primary Industry Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Primary Industry Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={industryId}
                    onChange={(e) => setIndustryId(e.target.value)}
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                    required
                  >
                    <option value="">Select Category</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Global Headquarters Address */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Global Headquarters Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={headquartersAddress}
                    onChange={(e) => setHeadquartersAddress(e.target.value)}
                    placeholder="450 Serra Mall, Stanford, CA 94305, United States"
                    disabled={isReadOnly}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isReadOnly
                        ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                        : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                    }`}
                    required
                  />
                  <p className="text-[11px] text-[#71787e]">
                    Must match the registered address on official corporate incorporation filings.
                  </p>
                </div>
              </div>
            </section>

            {/* PART 2 OF 3: Recruitment & Hiring Scope */}
            <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                    Recruitment & Hiring Scope
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#71787e]">Part 2 of 3</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Projected Open Roles */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Projected Open Roles (Per Quarter)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={intendedHiringMin}
                      onChange={(e) => setIntendedHiringMin(e.target.value)}
                      min={1}
                      placeholder="Min"
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                        isReadOnly
                          ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                          : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                      }`}
                    />
                    <span className="text-xs text-[#71787e]">to</span>
                    <input
                      type="number"
                      value={intendedHiringMax}
                      onChange={(e) => setIntendedHiringMax(e.target.value)}
                      min={1}
                      placeholder="Max"
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                        isReadOnly
                          ? 'bg-[#f7f9fb] text-[#41474d] border border-[#e0e3e5] cursor-not-allowed'
                          : 'bg-white border border-[#c3c7cb] text-[#191c1e] focus:outline-none focus:border-[#0058be]'
                      }`}
                    />
                  </div>
                </div>

                {/* Primary Talent Tracks */}
                <div className="sm:col-span-2 space-y-3 pt-3 border-t border-[#f1f4f6]">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-[#191c1e]">
                        Primary Functional Talent Tracks
                      </label>
                      <p className="text-[11px] text-[#71787e]">
                        Select or add key functional domains your organization hires for:
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0058be]">
                      {selectedTalentTrackIds.length + customTracks.length} Selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {allTalentTracks.map((track) => {
                      const active = selectedTalentTrackIds.includes(track.id);
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => !isReadOnly && toggleTalentTrack(track.id)}
                          disabled={isReadOnly}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isReadOnly ? 'cursor-default' : 'cursor-pointer'
                          } ${
                            active
                              ? 'bg-[#0058be] text-white shadow-xs'
                              : 'bg-[#f1f4f6] text-[#41474d] hover:bg-[#e0e3e5]'
                          }`}
                        >
                          {track.value}
                        </button>
                      );
                    })}

                    {customTracks.map((cTrack) => (
                      <span
                        key={cTrack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0058be] text-white shadow-xs"
                      >
                        <span>{cTrack}</span>
                        <span className="text-[9px] px-1 py-0.2 bg-white/20 rounded font-normal uppercase">
                          Custom
                        </span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeCustomTrack(cTrack)}
                            className="hover:text-red-200 transition-colors cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Search / Add Custom Track Input */}
                  {!isReadOnly && (
                    <div className="relative pt-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={trackSearch}
                          onChange={(e) => setTrackSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (trackSearch.trim()) {
                                handleAddTrack(trackSearch.trim());
                              }
                            }
                          }}
                          placeholder="Type to search or enter custom hiring track (e.g. AI Research, Robotics, Quantum)..."
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#c1c7ce] bg-white text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be]"
                        />
                        {trackSearch && (
                          <button
                            type="button"
                            onClick={() => setTrackSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71787e] hover:text-[#191c1e] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {trackSearch.trim() && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#e0e3e5] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 space-y-1">
                          {filteredTracks.slice(0, 5).map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => {
                                if (!selectedTalentTrackIds.includes(track.id)) {
                                  toggleTalentTrack(track.id);
                                }
                                setTrackSearch('');
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-[#191c1e] hover:bg-[#e8f0fe] hover:text-[#0058be] rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{track.value}</span>
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          ))}

                          {!allTalentTracks.some(
                            (t) => t.value.toLowerCase() === trackSearch.trim().toLowerCase()
                          ) &&
                            !customTracks.some(
                              (ct) => ct.toLowerCase() === trackSearch.trim().toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onClick={() => handleAddTrack(trackSearch.trim())}
                                className="w-full text-left px-3 py-2.5 text-xs font-bold text-[#0058be] bg-[#e8f0fe]/60 hover:bg-[#e8f0fe] rounded-lg transition-colors flex items-center justify-between border-t border-[#e0e3e5] cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[#0058be]" />
                                  <span>Add &ldquo;{trackSearch.trim()}&rdquo; as custom track</span>
                                </span>
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* PART 3 OF 3: Legal Compliance Documents */}
            <section className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                      Legal Compliance Documents
                    </h2>
                    <p className="text-[11px] text-[#71787e]">
                      Encrypted, role-restricted documents audited strictly by compliance specialists.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#71787e]">Part 3 of 3</span>
              </div>

              <div className="space-y-4">
                {/* 1. Certificate of Incorporation */}
                {(() => {
                  const doc = docs.find((d) => d.document_type === 'incorporation');
                  const uploading = uploadingDocType === 'incorporation';
                  return (
                    <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-[#191c1e]">
                            1. Certificate of Incorporation <span className="text-red-500">*</span>
                          </h3>
                          <p className="text-[11px] text-[#71787e]">
                            Official Articles of Organization or State Charter (PDF, PNG - Max 15 MB)
                          </p>
                        </div>
                        {doc ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                            Valid File Attached
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#71787e] text-[11px] font-semibold">
                            Pending Upload
                          </span>
                        )}
                      </div>

                      {doc ? (
                        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#0058be] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#191c1e] truncate">
                                {doc.original_filename}
                              </p>
                              <p className="text-[10px] text-[#71787e]">
                                SHA-256: {doc.checksum_sha256?.slice(0, 16)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownload(doc.id, doc.original_filename)}
                              className="p-1.5 text-[#0058be] hover:bg-[#e8f0fe] rounded-md cursor-pointer"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isReadOnly) setIsEditing(true);
                                setTimeout(() => fileInputs.incorporation.current?.click(), 50);
                              }}
                              disabled={uploading}
                              className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
                            >
                              {uploading ? 'Uploading...' : 'Replace'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputs.incorporation.current?.click()}
                          disabled={uploading}
                          className="w-full p-4 border border-dashed border-[#c3c7cb] rounded-xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[#0058be] cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{uploading ? 'Processing File...' : 'Upload Certificate of Incorporation'}</span>
                        </button>
                      )}
                      <input
                        type="file"
                        ref={fileInputs.incorporation}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('incorporation', file);
                          e.target.value = '';
                        }}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                    </div>
                  );
                })()}

                {/* 2. Tax Form */}
                {(() => {
                  const doc = docs.find((d) => d.document_type === 'tax_form');
                  const uploading = uploadingDocType === 'tax_form';
                  return (
                    <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-[#191c1e]">
                            2. Tax Form (W-9 / Form 1099 or National Certificate) <span className="text-red-500">*</span>
                          </h3>
                          <p className="text-[11px] text-[#71787e]">
                            Signed federal or domestic tax validation declaration (PDF - Max 15 MB)
                          </p>
                        </div>
                        {doc ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                            Valid File Attached
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#71787e] text-[11px] font-semibold">
                            Pending Upload
                          </span>
                        )}
                      </div>

                      {doc ? (
                        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#0058be] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#191c1e] truncate">
                                {doc.original_filename}
                              </p>
                              <p className="text-[10px] text-[#71787e]">
                                SHA-256: {doc.checksum_sha256?.slice(0, 16)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownload(doc.id, doc.original_filename)}
                              className="p-1.5 text-[#0058be] hover:bg-[#e8f0fe] rounded-md cursor-pointer"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isReadOnly) setIsEditing(true);
                                setTimeout(() => fileInputs.tax_form.current?.click(), 50);
                              }}
                              disabled={uploading}
                              className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
                            >
                              {uploading ? 'Uploading...' : 'Replace'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputs.tax_form.current?.click()}
                          disabled={uploading}
                          className="w-full p-4 border border-dashed border-[#c3c7cb] rounded-xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[#0058be] cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{uploading ? 'Processing File...' : 'Upload Tax Form (W-9 / 1099)'}</span>
                        </button>
                      )}
                      <input
                        type="file"
                        ref={fileInputs.tax_form}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('tax_form', file);
                          e.target.value = '';
                        }}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                    </div>
                  );
                })()}

                {/* 3. Business License or Utility Statement (Optional) */}
                {(() => {
                  const doc = docs.find((d) => d.document_type === 'business_license');
                  const uploading = uploadingDocType === 'business_license';
                  return (
                    <div className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-[#191c1e]">
                            3. Business License or Utility Statement{' '}
                            <span className="text-[#71787e] font-normal">(Recommended)</span>
                          </h3>
                          <p className="text-[11px] text-[#71787e]">
                            Valid municipal permit, commercial lease, or HQ utility invoice &lt; 90 days old
                          </p>
                        </div>
                        {doc ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                            Valid File Attached
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#71787e] text-[11px] font-semibold">
                            Optional
                          </span>
                        )}
                      </div>

                      {doc ? (
                        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#0058be] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#191c1e] truncate">
                                {doc.original_filename}
                              </p>
                              <p className="text-[10px] text-[#71787e]">
                                SHA-256: {doc.checksum_sha256?.slice(0, 16)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownload(doc.id, doc.original_filename)}
                              className="p-1.5 text-[#0058be] hover:bg-[#e8f0fe] rounded-md cursor-pointer"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isReadOnly) setIsEditing(true);
                                setTimeout(() => fileInputs.business_license.current?.click(), 50);
                              }}
                              disabled={uploading}
                              className="text-xs font-semibold text-[#0058be] hover:underline cursor-pointer"
                            >
                              {uploading ? 'Uploading...' : 'Replace'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputs.business_license.current?.click()}
                          disabled={uploading}
                          className="w-full p-4 border border-dashed border-[#c3c7cb] rounded-xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[#0058be] cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{uploading ? 'Processing File...' : 'Upload Business License or Utility Statement'}</span>
                        </button>
                      )}
                      <input
                        type="file"
                        ref={fileInputs.business_license}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('business_license', file);
                          e.target.value = '';
                        }}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Bottom Form Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || (isApproved && !isEditing) || isPending}
                  className="px-4 py-2.5 bg-white border border-[#c3c7cb] hover:bg-slate-50 text-xs font-semibold text-[#191c1e] rounded-xl shadow-xs transition-colors cursor-pointer w-full sm:w-auto text-center disabled:opacity-50"
                >
                  {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      loadVerificationData({ updateFormFields: true, showLoader: false });
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-[#71787e] hover:text-[#191c1e] text-center cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
                <Link
                  to="/recruiter/company/profile"
                  className="px-4 py-2.5 text-xs font-semibold text-[#71787e] hover:text-[#191c1e] text-center"
                >
                  Return to Profile
                </Link>
              </div>

              {isApproved && !isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Verification Details</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || isPending}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isPending
                      ? 'Application Under Review'
                      : submitting
                      ? 'Submitting...'
                      : (isApproved || isReverification)
                      ? 'Submit for Reverification'
                      : 'Submit for Review'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right Rail Details (1 Col) - Figma Page 8 */}
          <aside className="space-y-6">
            {/* Prestige & Delivery Preview */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
              <h3 className="font-bold text-[#191c1e] uppercase tracking-wider text-[11px] border-b border-[#f1f4f6] pb-2">
                Prestige & Delivery
              </h3>

              <div className="p-4 rounded-xl bg-linear-to-br from-slate-900 to-indigo-950 text-white space-y-2 text-center">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Enterprise</span>
                </div>
                <h4 className="font-extrabold text-sm">{name || 'Your Company'}</h4>
                <p className="text-[11px] text-slate-300">{companySize}</p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-[#41474d]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Unlimited Job Postings:</strong> Publish global listings with no throttles.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>4.2x Higher Response:</strong> Verified checkmarks increase candidate trust.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Global Compliance:</strong> Unlocks borderless contracts on approval.</span>
                </div>
              </div>
            </div>

            {/* Informational 24-48h SLA Card (Figma Page 8) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0058be]" />
                <h3 className="font-bold text-xs text-[#191c1e]">24–48h Review SLA</h3>
              </div>
              <p className="text-xs text-[#71787e] leading-relaxed">
                TalentBridge Trust &amp; Safety specialists audit corporate filings within 1–2 business days.
              </p>

              <div className="pt-2 border-t border-[#f1f4f6] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#191c1e]">Submission Readiness</span>
                  <span className="font-bold text-[#0058be]">{readiness}% Complete</span>
                </div>
                <div className="h-2 bg-[#e0e3e5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0058be] rounded-full transition-all duration-300"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Workflow Transitions Preview */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2.5 text-xs text-[#71787e]">
              <h3 className="font-bold text-[#191c1e] uppercase tracking-wider text-[11px]">
                Workflow Lifecycle
              </h3>
              <ul className="space-y-2 pt-1">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0058be] mt-1.5 shrink-0" />
                  <span>
                    <strong>State: Submitted (Under Review)</strong> — Read-only verification lock. Dashboard displays estimated review status.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>State: Approved</strong> — Unlocks all recruiting tabs, publishing, and enterprise badge.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>State: Reverification</strong> — Allows updates without disruption. Enterprise checkmark and active postings remain live while updates are audited.
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </RecruiterLayout>
  );
}

