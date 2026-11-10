import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  X,
  User,
  FileText,
  Paperclip,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Globe,
  MessageSquare,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import candidateApi from '../../api/candidateApi';
import applicationApi from '../../api/applicationApi';
import { useToast } from '../../context/ToastContext';

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.53 1.53 0 1 0 0-3.05 1.53 1.53 0 0 0 0 3.05m1.39 9.74v-8.37H5.07v8.37h2.78z" />
  </svg>
);

export default function ApplyJobMultiStepModal({ isOpen, onClose, job, onSuccess }) {
  const { user } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    linkedinUrl: '',
    portfolioUrl: '',
    selectedResumeId: null,
    messageToHiringManager: '',
    coverLetter: '',
    materials: [],
  });

  // Material input state
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('portfolio');

  useEffect(() => {
    if (isOpen && user) {
      loadCandidateData();
    }
  }, [isOpen, user]);

  const loadCandidateData = async () => {
    setLoading(true);
    try {
      const [resumesRes, profileRes] = await Promise.allSettled([
        candidateApi.getResumes(false),
        candidateApi.getProfile(),
      ]);

      let loadedResumes = [];
      if (resumesRes.status === 'fulfilled' && resumesRes.value.data) {
        loadedResumes = resumesRes.value.data;
        setResumes(loadedResumes);
      }

      let profile = {};
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        profile = profileRes.value.data;
      }

      const defaultResume = loadedResumes.find((r) => r.is_default) || loadedResumes[0];

      setFormData((prev) => ({
        ...prev,
        fullName: user.full_name || prev.fullName,
        email: user.email || prev.email,
        phone: profile.phone_number || prev.phone,
        linkedinUrl: profile.linkedin_url || prev.linkedinUrl,
        portfolioUrl: profile.portfolio_url || prev.portfolioUrl,
        selectedResumeId: defaultResume ? defaultResume.id : null,
      }));
    } catch {
      // Ignore background fetch error
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !job) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Resume file must be under 10MB.', 'error');
      return;
    }

    setUploadingResume(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const res = await candidateApi.uploadResume(fd);
      const newResume = res.data;
      setResumes((prev) => [newResume, ...prev]);
      setFormData((prev) => ({ ...prev, selectedResumeId: newResume.id }));
      showToast('Resume uploaded and selected.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload resume.', 'error');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAddMaterial = () => {
    if (!newMaterialName.trim() || !newMaterialUrl.trim()) {
      showToast('Please provide both material title and URL.', 'info');
      return;
    }
    if (formData.materials.length >= 5) {
      showToast('Maximum 5 materials allowed.', 'info');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          file_name: newMaterialName.trim(),
          file_url: newMaterialUrl.trim(),
          file_type: newMaterialType,
        },
      ],
    }));

    setNewMaterialName('');
    setNewMaterialUrl('');
  };

  const handleRemoveMaterial = (index) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitApplication = async () => {
    if (!formData.selectedResumeId) {
      showToast('Please select or upload a resume to submit.', 'error');
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        resume_id: formData.selectedResumeId,
        linkedin_url: formData.linkedinUrl,
        portfolio_url: formData.portfolioUrl,
        message_to_hiring_manager: formData.messageToHiringManager,
        cover_letter: formData.coverLetter,
        materials: formData.materials,
      };

      const res = await applicationApi.applyToJob(job.id, payload);
      showToast('Application submitted successfully!', 'success');
      if (onSuccess) {
        onSuccess(res.data.application);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit application.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Personal Info' },
    { num: 2, title: 'Resume & Pitch' },
    { num: 3, title: 'Materials' },
    { num: 4, title: 'Review & Submit' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#e0e3e5] relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e0e3e5]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">
              Job Application
            </span>
            <h2 className="text-xl font-black text-[#191c1e] tracking-tight mt-0.5">
              Apply for {job.job_title}
            </h2>
            <p className="text-xs text-[#71787e] mt-0.5">
              {job.company?.name} • {job.location || 'Remote'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-between py-4 border-b border-[#f1f4f6] px-2">
          {steps.map((st, idx) => (
            <div key={st.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  currentStep === st.num
                    ? 'bg-[#0058be] text-white shadow-xs'
                    : currentStep > st.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#f1f4f6] text-[#71787e]'
                }`}
              >
                {currentStep > st.num ? <CheckCircle2 className="w-4 h-4" /> : st.num}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  currentStep === st.num ? 'text-[#191c1e]' : 'text-[#71787e]'
                }`}
              >
                {st.title}
              </span>
              {idx < steps.length - 1 && (
                <div className="w-6 sm:w-10 h-0.5 bg-[#e0e3e5] mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Form Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-5 px-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
              <p className="text-xs text-[#71787e]">Loading application profile...</p>
            </div>
          ) : (
            <>
              {/* Step 1: Personal Info & Links (Screen 2) */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#191c1e]">
                    <User className="w-4 h-4 text-[#0058be]" />
                    <span>Personal & Contact Information</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#41474d] block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-sm focus:border-[#0058be] outline-none"
                        placeholder="e.g. Alex Sterling"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#41474d] block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] text-sm text-[#71787e] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#41474d] block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-sm focus:border-[#0058be] outline-none"
                      placeholder="e.g. +1 (555) 019-2834"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#f1f4f6] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#191c1e]">
                      <Globe className="w-4 h-4 text-[#0058be]" />
                      <span>Professional Links</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#41474d] block mb-1">
                        LinkedIn Profile URL
                      </label>
                      <div className="relative">
                        <LinkedinIcon className="w-4 h-4 text-[#71787e] absolute left-3.5 top-3" />
                        <input
                          type="url"
                          value={formData.linkedinUrl}
                          onChange={(e) =>
                            setFormData({ ...formData, linkedinUrl: e.target.value })
                          }
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-sm focus:border-[#0058be] outline-none"
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#41474d] block mb-1">
                        Portfolio / GitHub URL
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-[#71787e] absolute left-3.5 top-3" />
                        <input
                          type="url"
                          value={formData.portfolioUrl}
                          onChange={(e) =>
                            setFormData({ ...formData, portfolioUrl: e.target.value })
                          }
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-sm focus:border-[#0058be] outline-none"
                          placeholder="https://yourportfolio.dev"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Resume & Pitch */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#191c1e]">
                      <FileText className="w-4 h-4 text-[#0058be]" />
                      <span>Select Resume *</span>
                    </div>
                    <span className="text-xs text-[#71787e]">PDF, DOCX up to 10MB</span>
                  </div>

                  {/* Resumes List */}
                  <div className="space-y-2.5">
                    {resumes.length === 0 ? (
                      <div className="p-6 border-2 border-dashed border-[#c1c7ce] rounded-2xl text-center space-y-2">
                        <FileText className="w-8 h-8 text-[#71787e] mx-auto" />
                        <p className="text-xs font-semibold text-[#191c1e]">
                          No resumes uploaded yet
                        </p>
                        <p className="text-[11px] text-[#71787e]">
                          Upload a resume below to attach it to your application.
                        </p>
                      </div>
                    ) : (
                      resumes.map((r) => {
                        const isSelected = formData.selectedResumeId === r.id;
                        return (
                          <label
                            key={r.id}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#0058be] bg-[#f0f4fd] ring-1 ring-[#0058be]'
                                : 'border-[#e0e3e5] hover:border-[#c1c7ce] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="selected_resume"
                                checked={isSelected}
                                onChange={() =>
                                  setFormData({ ...formData, selectedResumeId: r.id })
                                }
                                className="w-4 h-4 text-[#0058be] focus:ring-[#0058be]"
                              />
                              <div>
                                <p className="text-xs font-bold text-[#191c1e]">
                                  {r.title || r.file_name}
                                </p>
                                <p className="text-[11px] text-[#71787e]">
                                  {r.file_size ? `${Math.round(r.file_size / 1024)} KB` : 'PDF'} •{' '}
                                  {r.is_default && (
                                    <span className="text-[#0058be] font-semibold">Primary • </span>
                                  )}
                                  Uploaded {new Date(r.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-[#0058be]" />
                            )}
                          </label>
                        );
                      })
                    )}

                    {/* Upload new button */}
                    <div className="pt-2">
                      <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[#0058be] text-[#0058be] hover:bg-[#f0f4fd] transition-colors cursor-pointer text-xs font-bold">
                        {uploadingResume ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Uploading resume...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Upload New Resume (PDF / DOCX)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          disabled={uploadingResume}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Message to Hiring Manager & Cover Letter */}
                  <div className="pt-3 border-t border-[#f1f4f6] space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[#41474d] flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#0058be]" />
                          <span>Message to Hiring Manager (Optional)</span>
                        </label>
                        <span className="text-[10px] text-[#71787e]">
                          {formData.messageToHiringManager.length}/255
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={255}
                        value={formData.messageToHiringManager}
                        onChange={(e) =>
                          setFormData({ ...formData, messageToHiringManager: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
                        placeholder="Briefly highlight why you're a great fit for this role..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#41474d] block mb-1">
                        Cover Letter (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.coverLetter}
                        onChange={(e) =>
                          setFormData({ ...formData, coverLetter: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
                        placeholder="Add your full cover letter or personal introduction..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Supplemental Materials */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#191c1e]">
                      <Paperclip className="w-4 h-4 text-[#0058be]" />
                      <span>Supplemental Materials & Links</span>
                    </div>
                    <span className="text-xs text-[#71787e]">
                      {formData.materials.length}/5 added
                    </span>
                  </div>

                  <p className="text-xs text-[#71787e]">
                    Attach work samples, design portfolios, certificates, or project repositories.
                  </p>

                  {/* Add Material Inputs */}
                  <div className="p-4 bg-[#f7f9fb] border border-[#e0e3e5] rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#41474d] block mb-1">
                          Material Title
                        </label>
                        <input
                          type="text"
                          value={newMaterialName}
                          onChange={(e) => setNewMaterialName(e.target.value)}
                          placeholder="e.g. Design Portfolio Case Study"
                          className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#41474d] block mb-1">
                          Material Type
                        </label>
                        <select
                          value={newMaterialType}
                          onChange={(e) => setNewMaterialType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white"
                        >
                          <option value="portfolio">Portfolio</option>
                          <option value="certificate">Certificate</option>
                          <option value="assignment">Assignment / Project</option>
                          <option value="link">External Link</option>
                          <option value="other">Other Document</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#41474d] block mb-1">
                        URL / Link
                      </label>
                      <input
                        type="url"
                        value={newMaterialUrl}
                        onChange={(e) => setNewMaterialUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMaterial}
                      className="px-3 py-2 rounded-xl bg-[#0058be] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#004ca5] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Material</span>
                    </button>
                  </div>

                  {/* Materials List */}
                  {formData.materials.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-[#191c1e] block">
                        Attached Items ({formData.materials.length})
                      </span>
                      {formData.materials.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white border border-[#e0e3e5] rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3.5 h-3.5 text-[#0058be]" />
                            <span className="font-semibold text-[#191c1e]">{m.file_name}</span>
                            <span className="text-[10px] uppercase font-bold text-[#71787e] bg-slate-100 px-2 py-0.5 rounded-md">
                              {m.file_type}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            className="text-[#ba1a1a] hover:bg-red-50 p-1 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Submit (No ATS preview shown to candidate) */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-[#f0f4fd] border border-[#d0e1fd] space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0058be] block">
                      Application Summary
                    </span>
                    <h3 className="text-base font-bold text-[#191c1e]">
                      {job.job_title}
                    </h3>
                    <p className="text-xs text-[#41474d]">
                      {job.company?.name} • {job.location || 'Remote'} • {job.employment_type}
                    </p>
                  </div>

                  {/* Selected Resume preview */}
                  <div className="p-4 bg-white border border-[#e0e3e5] rounded-2xl space-y-1.5">
                    <span className="text-xs font-bold text-[#71787e] block">
                      Attached Resume
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#191c1e]">
                      <FileText className="w-4 h-4 text-[#0058be]" />
                      <span>
                        {resumes.find((r) => r.id === formData.selectedResumeId)?.title ||
                          'Resume Attached'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white border border-[#e0e3e5] rounded-2xl text-xs">
                    <div>
                      <span className="text-[#71787e] font-medium block">Applicant Name:</span>
                      <span className="font-bold text-[#191c1e]">{formData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[#71787e] font-medium block">Email:</span>
                      <span className="font-bold text-[#191c1e]">{formData.email}</span>
                    </div>
                    {formData.phone && (
                      <div>
                        <span className="text-[#71787e] font-medium block">Phone:</span>
                        <span className="font-bold text-[#191c1e]">{formData.phone}</span>
                      </div>
                    )}
                    {formData.linkedinUrl && (
                      <div>
                        <span className="text-[#71787e] font-medium block">LinkedIn:</span>
                        <span className="font-semibold text-[#0058be] truncate block">
                          {formData.linkedinUrl}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submission note */}
                  <div className="p-3.5 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl flex items-start gap-2 text-xs text-[#41474d]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      By submitting, your resume and profile will be transferred directly to{' '}
                      <span className="font-semibold text-[#191c1e]">{job.company?.name}</span>'s hiring team.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-4 border-t border-[#e0e3e5] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#71787e] hover:bg-[#f1f4f6] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitApplication}
              className="px-6 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] disabled:opacity-50 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Application</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
