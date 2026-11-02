import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  Download,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Archive,
  Eye,
  FileCode,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import { candidateApi } from '../../api/candidateApi';
import { useToast } from '../../context/ToastContext';
import ATSAnalysisModal from '../../components/candidate/ATSAnalysisModal';

export default function ResumeManagementPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ATS Modal state
  const [selectedResumeForATS, setSelectedResumeForATS] = useState(null);
  const [reanalyzingId, setReanalyzingId] = useState(null);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const res = await candidateApi.getResumes(showArchived);
      setResumes(res.data || []);
    } catch (err) {
      console.error('Failed to load resumes:', err);
      showToast('Failed to load resumes list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [showArchived]);

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      showToast('Only PDF and DOCX files are allowed.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5 MB.', 'error');
      return;
    }
    setSelectedFile(file);
    if (!resumeTitle) {
      setResumeTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // Upload Resume
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a resume file to upload.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', resumeTitle.trim() || selectedFile.name);
    formData.append('is_default', isDefault ? 'true' : 'false');

    try {
      setUploading(true);
      setUploadProgress(20);
      await candidateApi.uploadResume(formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });
      showToast('Resume uploaded and ATS analyzed!', 'success');
      setSelectedFile(null);
      setResumeTitle('');
      setIsDefault(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadResumes();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to upload resume.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Set Default
  const handleSetDefault = async (id) => {
    try {
      await candidateApi.setDefaultResume(id);
      showToast('Primary resume updated.', 'success');
      loadResumes();
    } catch (err) {
      showToast('Failed to set primary resume.', 'error');
    }
  };

  // Archive Resume
  const handleArchive = async (id) => {
    if (!window.confirm('Are you sure you want to archive this resume?')) return;
    try {
      await candidateApi.archiveResume(id);
      showToast('Resume archived.', 'info');
      loadResumes();
    } catch (err) {
      showToast('Failed to archive resume.', 'error');
    }
  };

  // Re-Analyze Resume
  const handleReanalyze = async (id) => {
    try {
      setReanalyzingId(id);
      const res = await candidateApi.analyzeResume(id);
      showToast(`ATS Analysis refreshed! Score: ${res.data.ats_score}/100`, 'success');
      loadResumes();
    } catch (err) {
      showToast('Failed to re-analyze resume.', 'error');
    } finally {
      setReanalyzingId(null);
    }
  };

  // Download Resume
  const handleDownload = async (resume) => {
    try {
      const res = await candidateApi.downloadResume(resume.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: resume.file_type }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resume.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Resume download started.', 'info');
    } catch (err) {
      showToast('Failed to download resume file.', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAtsBadge = (score) => {
    if (score === null || score === undefined) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
          Not Analyzed
        </span>
      );
    }
    if (score >= 75) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          ATS: {score}/100
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          ATS: {score}/100
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-rose-600" />
        ATS: {score}/100
      </span>
    );
  };

  return (
    <CandidateLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#191c1e]">Resume Management & ATS</h1>
            <p className="text-xs text-[#71787e] mt-0.5">
              Upload multiple targeted resumes, designate your primary profile CV, and optimize ATS match scores.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                showArchived
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-[#c3c7cb] hover:bg-slate-50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        {/* Upload Dropzone Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e5] p-6 shadow-xs">
          <h3 className="font-bold text-sm text-[#191c1e] mb-3 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-[#0058be]" />
            Upload New Resume
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-[#0058be] bg-blue-50/30'
                  : 'border-slate-300 hover:border-[#0058be] hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-[#0058be]/10 text-[#0058be] flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-[#191c1e]">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                  <p className="text-[10px] text-[#0058be] font-medium mt-1">Click to choose a different file</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-[#191c1e]">
                    Drag & drop your resume here, or <span className="text-[#0058be] underline">browse files</span>
                  </p>
                  <p className="text-[11px] text-[#71787e] mt-1">
                    Supports PDF and DOCX documents up to 5 MB
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1e] mb-1">Resume Title</label>
                  <input
                    type="text"
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Resume 2026"
                    className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="setDefaultCheck"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0058be] focus:ring-[#0058be]"
                  />
                  <label htmlFor="setDefaultCheck" className="text-xs font-medium text-[#191c1e]">
                    Set as my Primary / Default Resume
                  </label>
                </div>
              </div>
            )}

            {selectedFile && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setResumeTitle('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg border border-[#c3c7cb] text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-lg bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
                >
                  {uploading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      Analyzing ATS ({uploadProgress}%)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Upload & Analyze ATS
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Resumes List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#191c1e]">
              {showArchived ? 'All Resumes (Including Archived)' : 'Active Resumes'} ({resumes.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0058be]" />
              <p className="text-xs">Loading resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-10 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No resumes found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Upload your resume above to see your ATS score and unlock direct applications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((resume) => {
                const isPrimary = resume.is_default;
                const isArchived = Boolean(resume.archived_at);

                return (
                  <div
                    key={resume.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isPrimary
                        ? 'border-[#0058be] ring-1 ring-[#0058be]/20'
                        : isArchived
                        ? 'border-slate-200 bg-slate-50/60 opacity-80'
                        : 'border-[#e0e3e5] hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Row: Title, Badges */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0058be] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#191c1e] line-clamp-1">
                                {resume.title}
                              </h4>
                              {isPrimary && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0058be] text-white flex items-center gap-1 shadow-2xs shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  Primary
                                </span>
                              )}
                              {isArchived && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 shrink-0">
                                  Archived
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#71787e] mt-0.5 truncate max-w-xs">
                              {resume.file_name} • {formatFileSize(resume.file_size)}
                            </p>
                          </div>
                        </div>

                        {/* ATS Badge */}
                        <div>{getAtsBadge(resume.ats_score)}</div>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Uploaded on {new Date(resume.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {!isPrimary && !isArchived && (
                          <button
                            onClick={() => handleSetDefault(resume.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#0058be] hover:text-[#0058be] text-slate-700 font-medium transition-colors"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedResumeForATS(resume)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0058be] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          View ATS Report
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReanalyze(resume.id)}
                          disabled={reanalyzingId === resume.id}
                          className="p-1.5 text-slate-400 hover:text-[#0058be] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Re-run ATS analysis"
                        >
                          <RotateCw
                            className={`w-4 h-4 ${reanalyzingId === resume.id ? 'animate-spin text-[#0058be]' : ''}`}
                          />
                        </button>
                        <button
                          onClick={() => handleDownload(resume)}
                          className="p-1.5 text-slate-400 hover:text-[#0058be] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download resume"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {!isArchived && (
                          <button
                            onClick={() => handleArchive(resume.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ATS Analysis Report Modal */}
      {selectedResumeForATS && (
        <ATSAnalysisModal
          resume={selectedResumeForATS}
          onClose={() => setSelectedResumeForATS(null)}
        />
      )}
    </CandidateLayout>
  );
}
