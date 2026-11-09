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

  // Hidden File Input Refs
  const fileInputs = {
    incorporation: useRef(null),
    tax_form: useRef(null),
    business_license: useRef(null),
  };

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      const [vRes, indRes, trackRes] = await Promise.all([
        companyApi.getVerificationStatus(),
        masterDataApi.getCategoryItems('industry'),
        masterDataApi.getCategoryItems('talent_track'),
      ]);

      setVerification(vRes.data);
      setIndustries(indRes.data || []);
      setAllTalentTracks(trackRes.data || []);

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
    } catch (err) {
      showToast('Failed to load verification status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData();
  }, []);

  const toggleTalentTrack = (id) => {
    setSelectedTalentTrackIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  // Document Upload
  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);

    try {
      setUploadingDocType(documentType);
      await companyApi.uploadVerificationDocument(formData);
      showToast('Document uploaded and cryptographic checksum generated.', 'success');
      loadVerificationData();
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
      const payload = {
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
        talent_track_ids: selectedTalentTrackIds,
      };

      await companyApi.saveVerificationDraft(payload);
      showToast('Verification draft saved successfully.', 'success');
      loadVerificationData();
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
      const payload = {
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
        talent_track_ids: selectedTalentTrackIds,
      };

      await companyApi.submitVerification(payload);
      showToast('Verification submitted! Our compliance team will review your application.', 'success');
      loadVerificationData();
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

  const isApproved = verification?.status === 'APPROVED';
  const isPending = verification?.status === 'PENDING' || verification?.status === 'UNDER_REVIEW';
  const isRejected = verification?.status === 'REJECTED';

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

        {/* Breadcrumb & Header (Figma Page 8) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#71787e] tracking-wider uppercase">
            <span>Onboarding</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Company Setup</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#0058be]" />
            <span className="text-[#0058be]">Organization Verification</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#191c1e] tracking-tight">
            Verify Your Company
          </h1>
          <p className="text-xs sm:text-sm text-[#41474d] max-w-3xl leading-relaxed">
            Official corporate verification establishes immediate trust with top-tier candidates and unlocks
            high-volume recruiting pipelines. Review cycles average 24 to 48 business hours.
          </p>
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    required
                  />
                </div>

                {/* Company Size */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Company Size (Global headcount)</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
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
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    />
                    <span className="text-xs text-[#71787e]">to</span>
                    <input
                      type="number"
                      value={intendedHiringMax}
                      onChange={(e) => setIntendedHiringMax(e.target.value)}
                      min={1}
                      placeholder="Max"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                </div>

                {/* Primary Talent Tracks */}
                <div className="sm:col-span-2 space-y-2 pt-2">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Primary Functional Talent Tracks
                  </label>
                  <p className="text-[11px] text-[#71787e]">
                    Calibrates candidate compliance thresholds and matching algorithms:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {allTalentTracks.map((track) => {
                      const active = selectedTalentTrackIds.includes(track.id);
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => toggleTalentTrack(track.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0058be] text-white shadow-xs'
                              : 'bg-[#f1f4f6] text-[#41474d] hover:bg-[#e0e3e5]'
                          }`}
                        >
                          {track.value}
                        </button>
                      );
                    })}
                  </div>
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
                              onClick={() => fileInputs.incorporation.current?.click()}
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
                        onChange={(e) => handleFileUpload('incorporation', e.target.files?.[0])}
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
                              onClick={() => fileInputs.tax_form.current?.click()}
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
                        onChange={(e) => handleFileUpload('tax_form', e.target.files?.[0])}
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
                              onClick={() => fileInputs.business_license.current?.click()}
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
                        onChange={(e) => handleFileUpload('business_license', e.target.files?.[0])}
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
                  disabled={savingDraft || isApproved}
                  className="px-4 py-2.5 bg-white border border-[#c3c7cb] hover:bg-slate-50 text-xs font-semibold text-[#191c1e] rounded-xl shadow-xs transition-colors cursor-pointer w-full sm:w-auto text-center disabled:opacity-50"
                >
                  {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                </button>
                <Link
                  to="/recruiter/company/profile"
                  className="px-4 py-2.5 text-xs font-semibold text-[#71787e] hover:text-[#191c1e] text-center"
                >
                  Cancel & Return
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting || isApproved || isPending}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isApproved
                    ? 'Company Already Verified'
                    : isPending
                    ? 'Application Under Review'
                    : submitting
                    ? 'Submitting...'
                    : 'Submit for Review'}
                </span>
              </button>
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
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </RecruiterLayout>
  );
}

