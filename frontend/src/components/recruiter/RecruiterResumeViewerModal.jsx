import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  Plus,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { candidateApi } from '../../api/candidateApi';
import { useToast } from '../../context/ToastContext';

export default function RecruiterResumeViewerModal({
  isOpen,
  onClose,
  application,
  onAdvance,
  onAddNote,
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('formatted'); // 'formatted' | 'raw' | 'pdf'

  const [fileBlobUrl, setFileBlobUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const candidate = application?.candidate_profile || application?.candidate || {};
  const resume = application?.resume || {};
  const job = application?.job || {};

  const isPdf =
    resume.file_type === 'application/pdf' ||
    resume.file_name?.toLowerCase().endsWith('.pdf') ||
    (!resume.file_name?.toLowerCase().endsWith('.docx') &&
      !resume.file_name?.toLowerCase().endsWith('.doc'));

  // Load resume blob for inline original file preview
  useEffect(() => {
    let isMounted = true;
    let createdUrl = null;

    const loadResumeFile = async () => {
      if (!isOpen || !resume?.id) return;
      if (activeTab === 'pdf' && !fileBlobUrl && !loadingFile) {
        setLoadingFile(true);
        setFileError(null);
        try {
          const res = await candidateApi.downloadResume(resume.id);
          const mimeType = resume.file_type || res.headers?.['content-type'] || 'application/pdf';
          const blob = new Blob([res.data], { type: mimeType });
          createdUrl = window.URL.createObjectURL(blob);
          if (isMounted) {
            setFileBlobUrl(createdUrl);
          }
        } catch (err) {
          console.error('Failed to load resume file:', err);
          if (isMounted) {
            setFileError('Could not load the original resume file.');
          }
        } finally {
          if (isMounted) {
            setLoadingFile(false);
          }
        }
      }
    };

    loadResumeFile();

    return () => {
      isMounted = false;
    };
  }, [activeTab, resume?.id, isOpen]);

  // Clean up Object URL when modal closes or unmounts
  useEffect(() => {
    if (!isOpen && fileBlobUrl) {
      window.URL.revokeObjectURL(fileBlobUrl);
      setFileBlobUrl(null);
      setFileError(null);
    }
  }, [isOpen]);

  const handleDownload = async () => {
    if (!resume?.id) {
      showToast('No resume file associated with this application.', 'error');
      return;
    }

    setDownloading(true);
    try {
      const res = await candidateApi.downloadResume(resume.id);
      const mimeType = resume.file_type || res.headers?.['content-type'] || 'application/pdf';
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = resume.file_name?.split('.').pop() || (mimeType.includes('pdf') ? 'pdf' : 'docx');
      const baseName = candidate.full_name
        ? `${candidate.full_name.replace(/\s+/g, '_')}_Resume`
        : 'Resume';
      const downloadName = resume.file_name || `${baseName}.${ext}`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Resume downloaded successfully.', 'success');
    } catch (err) {
      console.error('Failed to download resume:', err);
      showToast('Failed to download resume file.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[92vh] shadow-2xl border border-[#e0e3e5] relative flex flex-col overflow-hidden">
        {/* Top Header Bar (Figma Page 8) */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-black text-[#191c1e] tracking-tight">
                {candidate.full_name || 'Candidate'}'s Resume
              </h2>
              <p className="text-xs text-[#71787e]">
                Applied for{' '}
                <span className="font-semibold text-[#191c1e]">{job.job_title}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons (Figma Page 8) */}
          <div className="flex items-center gap-2.5">
            {resume.id && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-3.5 py-2 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0058be]" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {downloading ? 'Downloading...' : isPdf ? 'Download PDF' : 'Download Resume'}
                </span>
              </button>
            )}

            {onAdvance && (
              <button
                type="button"
                onClick={onAdvance}
                className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Advance Candidate</span>
              </button>
            )}

            {onAddNote && (
              <button
                type="button"
                onClick={onAddNote}
                className="px-3 py-2 rounded-xl border border-[#0058be] text-[#0058be] hover:bg-blue-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="px-6 py-2.5 bg-[#f7f9fb] border-b border-[#e0e3e5] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
              Document View:
            </span>
            <button
              onClick={() => setActiveTab('formatted')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeTab === 'formatted'
                  ? 'bg-white text-[#0058be] shadow-xs border border-[#e0e3e5]'
                  : 'text-[#71787e] hover:text-[#191c1e]'
              }`}
            >
              Formatted Dossier
            </button>
            {resume.extracted_text && (
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'raw'
                    ? 'bg-white text-[#0058be] shadow-xs border border-[#e0e3e5]'
                    : 'text-[#71787e] hover:text-[#191c1e]'
                }`}
              >
                Extracted Text
              </button>
            )}
            {resume.id && (
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-white text-[#0058be] shadow-xs border border-[#e0e3e5]'
                    : 'text-[#71787e] hover:text-[#191c1e]'
                }`}
              >
                Original File
              </button>
            )}
          </div>

          <span className="text-[11px] text-[#71787e]">
            {resume.title || 'Submitted Application Resume'}
          </span>
        </div>

        {/* Document Content Viewport (Figma Page 8) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-[#f7f9fb] flex flex-col">
          {activeTab === 'pdf' ? (
            loadingFile ? (
              <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-[#e0e3e5]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
                <p className="text-xs font-semibold text-[#71787e]">
                  Loading original resume document...
                </p>
              </div>
            ) : fileError ? (
              <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-[#e0e3e5] p-8 text-center my-auto">
                <AlertCircle className="w-10 h-10 text-rose-600" />
                <p className="text-sm font-bold text-[#191c1e]">Failed to load resume document</p>
                <p className="text-xs text-[#71787e]">{fileError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFileBlobUrl(null);
                    setFileError(null);
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#0058be] text-white text-xs font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : fileBlobUrl && isPdf ? (
              <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-xs border border-[#e0e3e5] overflow-hidden">
                {/* PDF Toolbar */}
                <div className="px-4 py-2.5 bg-[#f1f4f6] border-b border-[#e0e3e5] flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 text-[#41474d] font-semibold">
                    <FileText className="w-4 h-4 text-[#0058be]" />
                    <span className="truncate max-w-xs">{resume.file_name || 'Resume.pdf'}</span>
                    {resume.file_size ? (
                      <span className="text-[11px] text-[#71787e]">
                        ({Math.round(resume.file_size / 1024)} KB)
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(fileBlobUrl, '_blank')}
                      className="px-2.5 py-1 rounded-lg border border-[#c1c7ce] bg-white text-xs font-bold text-[#41474d] hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open full PDF in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#0058be]" />
                      <span>Open in New Tab</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading}
                      className="px-2.5 py-1 rounded-lg bg-[#0058be] text-xs font-bold text-white hover:bg-[#004ca5] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* PDF Viewer */}
                <iframe
                  src={fileBlobUrl}
                  title="Candidate Original Resume"
                  className="w-full flex-1 min-h-[600px] border-none"
                />
              </div>
            ) : (
              /* Non-PDF File (e.g. Word DOCX) */
              <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xs border border-[#e0e3e5] text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0058be] flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#191c1e]">
                    {resume.file_name || 'Original Resume Document'}
                  </h3>
                  <p className="text-xs text-[#71787e] mt-1">
                    Word Document ({resume.file_name?.split('.').pop()?.toUpperCase() || 'DOCX'})
                    {resume.file_size ? ` • ${Math.round(resume.file_size / 1024)} KB` : ''}
                  </p>
                </div>
                <p className="text-xs text-[#5f6368] leading-relaxed max-w-md mx-auto">
                  Word documents cannot be previewed natively in the browser frame. You can
                  download the original file to view on your device, or review the extracted text
                  and structured profile in the tabs above.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="px-5 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloading ? 'Downloading...' : 'Download Document'}</span>
                  </button>
                  {resume.extracted_text && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('raw')}
                      className="px-4 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors cursor-pointer"
                    >
                      View Extracted Text
                    </button>
                  )}
                </div>
              </div>
            )
          ) : activeTab === 'raw' && resume.extracted_text ? (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xs border border-[#e0e3e5] font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#191c1e]">
              {resume.extracted_text}
            </div>
          ) : (
            /* Formatted Resume Paper Viewport (Figma Page 8) */
            <div className="max-w-2xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-[#e0e3e5] space-y-8 text-xs text-[#191c1e]">
              {/* Resume Header */}
              <div className="border-b border-[#e0e3e5] pb-6 text-center space-y-2">
                <h1 className="text-2xl font-black tracking-tight text-[#191c1e]">
                  {candidate.full_name}
                </h1>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0058be]">
                  {candidate.headline || 'Software Engineering Professional'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#71787e] pt-1">
                  {candidate.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {candidate.email}
                    </span>
                  )}
                  {candidate.phone_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {candidate.phone_number}
                    </span>
                  )}
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {candidate.location}
                    </span>
                  )}
                  {candidate.portfolio_url && (
                    <a
                      href={candidate.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0058be] hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      Portfolio
                    </a>
                  )}
                </div>
              </div>

              {/* Professional Summary */}
              {candidate.bio && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Professional Summary
                  </h3>
                  <p className="text-xs text-[#41474d] leading-relaxed">
                    {candidate.bio}
                  </p>
                </div>
              )}

              {/* Experience Section */}
              {candidate.experiences?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {candidate.experiences.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-sm text-[#191c1e]">
                            {exp.job_title}
                          </span>
                          <span className="text-[11px] text-[#71787e]">
                            {exp.start_date} – {exp.is_current ? 'Present' : exp.end_date}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#0058be]">
                          {exp.company_name}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-[#41474d] leading-relaxed whitespace-pre-line pt-0.5">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Grid */}
              {candidate.skills?.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Competencies & Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((sk) => (
                      <span
                        key={sk.id}
                        className="px-2.5 py-1 rounded-lg bg-[#f0f4fd] border border-[#d0e1fd] text-xs font-semibold text-[#0058be]"
                      >
                        {sk.name}
                        {sk.proficiency_level && ` (${sk.proficiency_level})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Section */}
              {candidate.educations?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Education
                  </h3>
                  <div className="space-y-3">
                    {candidate.educations.map((edu) => (
                      <div key={edu.id} className="space-y-0.5">
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-xs text-[#191c1e]">
                            {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                          </span>
                          <span className="text-[11px] text-[#71787e]">
                            {edu.start_date} – {edu.end_date || 'Present'}
                          </span>
                        </div>
                        <p className="text-xs text-[#71787e]">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
