import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  CalendarCheck2,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  Trash2,
  Edit2,
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  Award,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import applicationApi from '../../api/applicationApi';
import RecruiterResumeViewerModal from '../../components/recruiter/RecruiterResumeViewerModal';
import RejectionReasonModal from '../../components/recruiter/RejectionReasonModal';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.53 1.53 0 1 0 0-3.05 1.53 1.53 0 0 0 0 3.05m1.39 9.74v-8.37H5.07v8.37h2.78z" />
  </svg>
);

export default function RecruiterApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('experience'); // 'experience' | 'education' | 'materials'

  // Modals
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);

  // Notes state
  const [newNoteText, setNewNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    fetchApplicationDossier();
  }, [id]);

  const fetchApplicationDossier = async () => {
    setLoading(true);
    try {
      const res = await applicationApi.getRecruiterApplicationDetail(id);
      setApplication(res.data);
    } catch (err) {
      showToast('Application dossier not found.', 'error');
      navigate('/recruiter/applicants');
    } finally {
      setLoading(false);
    }
  };

  const handleStageMove = async (targetStageId) => {
    try {
      await applicationApi.moveApplicationStage(id, { target_stage_id: targetStageId });
      showToast('Pipeline stage updated.', 'success');
      fetchApplicationDossier();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update stage.', 'error');
    }
  };

  const handleShortlist = async () => {
    try {
      await applicationApi.shortlistApplication(id);
      showToast('Candidate shortlisted!', 'success');
      fetchApplicationDossier();
    } catch (err) {
      showToast('Failed to shortlist.', 'error');
    }
  };

  const handleHire = async () => {
    try {
      await applicationApi.hireApplication(id);
      showToast('Candidate marked as hired!', 'success');
      fetchApplicationDossier();
    } catch (err) {
      showToast('Failed to mark as hired.', 'error');
    }
  };

  const handleReject = async (reason) => {
    try {
      await applicationApi.rejectApplication(id, { rejection_reason: reason });
      showToast('Application rejected.', 'info');
      fetchApplicationDossier();
    } catch (err) {
      showToast('Failed to reject application.', 'error');
    }
  };

  const handleAddNote = async (e) => {
    e?.preventDefault();
    if (!newNoteText.trim()) return;

    setSubmittingNote(true);
    try {
      await applicationApi.addApplicationNote(id, { note: newNoteText.trim() });
      showToast('Note added.', 'success');
      setNewNoteText('');
      fetchApplicationDossier();
    } catch (err) {
      showToast('Failed to add note.', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await applicationApi.deleteApplicationNote(id, noteId);
      showToast('Note removed.', 'info');
      fetchApplicationDossier();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete note.', 'error');
    }
  };

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
          <p className="text-xs text-[#71787e]">Loading candidate screening dossier...</p>
        </div>
      </RecruiterLayout>
    );
  }

  if (!application) return null;

  const candidate = application.candidate_profile || {};
  const job = application.job || {};
  const ats = application.ats_match || {};
  const stages = application.stages || [];
  const currentStage = application.current_stage || {};

  return (
    <RecruiterLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#71787e]">
          <Link
            to="/recruiter/applicants"
            className="hover:text-[#0058be] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Applicants Directory</span>
          </Link>
          <span>/</span>
          <span className="text-[#191c1e] font-bold">{candidate.full_name}</span>
        </div>

        {/* Top Header Section (Figma Page 7) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#71787e]">
                <span>Applicant</span>
                <span>•</span>
                <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                {application.reviewed_at && (
                  <>
                    <span>•</span>
                    <span className="text-[#0058be]">First Reviewed</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-black text-[#191c1e] tracking-tight mt-1">
                {candidate.full_name}
              </h1>
              <p className="text-xs text-[#71787e] mt-1">
                Applying for:{' '}
                <span className="font-bold text-[#191c1e]">{job.job_title}</span> • Req ID: #{job.id}
              </p>
            </div>

            {/* Header Action Buttons (Figma Page 7) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Resume Button */}
              <button
                type="button"
                onClick={() => setResumeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-[#0058be]" />
                <span>Resume</span>
              </button>

              {/* Message (Placeholder for messaging module) */}
              <button
                type="button"
                onClick={() =>
                  showToast('Candidate messaging thread will be active in the Messaging module.', 'info')
                }
                className="px-4 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-[#71787e]" />
                <span>Message</span>
              </button>

              {/* Schedule Interview (Placeholder for interview module) */}
              <button
                type="button"
                onClick={() =>
                  showToast('Multi-panel interview scheduling will be active in the Interview Scheduling module.', 'info')
                }
                className="px-4 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>Schedule Interview</span>
              </button>

              {/* Status Actions */}
              <button
                type="button"
                onClick={handleShortlist}
                className="px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Shortlist
              </button>

              <button
                type="button"
                onClick={handleHire}
                className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Direct Hire
              </button>

              {application.application_status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => setRejectionModalOpen(true)}
                  className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-[#ba1a1a] hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reject
                </button>
              )}
            </div>
          </div>

          {/* Candidate Profile Quick Info Strip (Figma Page 7) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] text-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#0058be]/10 text-[#0058be] font-bold text-lg flex items-center justify-center shrink-0 overflow-hidden">
              {candidate.profile_picture_url ? (
                <img
                  src={resolvePhotoUrl(candidate.profile_picture_url)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                candidate.full_name?.charAt(0) || 'C'
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71787e] block">
                  Current Role
                </span>
                <span className="font-bold text-[#191c1e]">
                  {candidate.headline || 'Software Engineer'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71787e] block">
                  Location
                </span>
                <span className="font-bold text-[#191c1e]">
                  {candidate.location || 'Remote'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71787e] block">
                  Email
                </span>
                <span className="font-bold text-[#191c1e] truncate block">
                  {candidate.email}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71787e] block">
                  Links
                </span>
                <div className="flex items-center gap-3 pt-0.5">
                  {candidate.portfolio_url && (
                    <a
                      href={candidate.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0058be] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Portfolio</span>
                    </a>
                  )}
                  {candidate.linkedin_url && (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0058be] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <LinkedinIcon className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Application Pipeline Stepper (Figma Page 7) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e]">
                Application Pipeline Stage
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-[#0058be] border border-blue-200">
                Current Status: {application.application_status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stages.map((st) => {
                const isCurrent = currentStage.id === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStageMove(st.id)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-[#0058be] bg-[#f0f4fd] ring-2 ring-[#0058be]/20'
                        : 'border-[#e0e3e5] bg-white hover:border-[#c1c7ce]'
                    }`}
                  >
                    <div className="flex items-center justify-center mx-auto mb-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCurrent ? 'bg-[#0058be] text-white' : 'bg-[#f1f4f6] text-[#71787e]'
                        }`}
                      >
                        {st.order}
                      </div>
                    </div>
                    <p className="text-xs font-bold text-[#191c1e] truncate">{st.name}</p>
                    <span className="text-[10px] font-semibold text-[#71787e] block">
                      {isCurrent ? 'Active Stage' : 'Click to Move'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2 Columns: Candidate Deep Dossier & Screening Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Candidate Experience, Education, Feedback (Figma Page 7) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-[#e0e3e5] pb-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('experience')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'experience'
                    ? 'bg-[#0058be] text-white shadow-xs'
                    : 'text-[#71787e] hover:bg-[#f1f4f6]'
                }`}
              >
                Experience & Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('education')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'education'
                    ? 'bg-[#0058be] text-white shadow-xs'
                    : 'text-[#71787e] hover:bg-[#f1f4f6]'
                }`}
              >
                Education & Skills
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('materials')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'materials'
                    ? 'bg-[#0058be] text-white shadow-xs'
                    : 'text-[#71787e] hover:bg-[#f1f4f6]'
                }`}
              >
                Submitted Materials ({application.materials?.length || 0})
              </button>
            </div>

            {/* Tab 1: Experience & Summary */}
            {activeTab === 'experience' && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] shadow-xs space-y-6 animate-in fade-in">
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

                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Work Experience History
                  </h3>
                  {candidate.experiences?.length > 0 ? (
                    <div className="space-y-4">
                      {candidate.experiences.map((exp) => (
                        <div key={exp.id} className="p-4 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] space-y-1.5 text-xs">
                          <div className="flex items-baseline justify-between">
                            <h4 className="font-bold text-sm text-[#191c1e]">{exp.job_title}</h4>
                            <span className="text-[11px] text-[#71787e]">
                              {exp.start_date} – {exp.is_current ? 'Present' : exp.end_date}
                            </span>
                          </div>
                          <p className="font-semibold text-[#0058be]">{exp.company_name}</p>
                          {exp.description && (
                            <p className="text-[#41474d] whitespace-pre-line leading-relaxed pt-1">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#71787e]">No employment records provided.</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Education & Skills */}
            {activeTab === 'education' && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] shadow-xs space-y-6 animate-in fade-in">
                {/* Competencies */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Verified Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills?.map((sk) => (
                      <span
                        key={sk.id}
                        className="px-3 py-1 rounded-xl bg-[#f0f4fd] border border-[#d0e1fd] text-xs font-bold text-[#0058be]"
                      >
                        {sk.name}
                        {sk.proficiency_level && ` (${sk.proficiency_level})`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-3 pt-3 border-t border-[#f1f4f6]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Academic History
                  </h3>
                  {candidate.educations?.length > 0 ? (
                    <div className="space-y-3">
                      {candidate.educations.map((edu) => (
                        <div key={edu.id} className="p-4 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] text-xs space-y-1">
                          <div className="flex items-baseline justify-between">
                            <h4 className="font-bold text-sm text-[#191c1e]">
                              {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                            </h4>
                            <span className="text-[11px] text-[#71787e]">
                              {edu.start_date} – {edu.end_date || 'Present'}
                            </span>
                          </div>
                          <p className="text-[#71787e]">{edu.institution}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#71787e]">No education entries found.</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Materials & Cover Letter */}
            {activeTab === 'materials' && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] shadow-xs space-y-6 animate-in fade-in">
                {/* Attached Resume */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Application Resume
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-[#f7f9fb] border border-[#e0e3e5] rounded-2xl text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#0058be]" />
                      <div>
                        <p className="font-bold text-[#191c1e]">{application.resume?.title}</p>
                        <p className="text-[11px] text-[#71787e]">
                          Uploaded during candidate application
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0058be] text-white font-bold text-xs"
                    >
                      Inspect Resume
                    </button>
                  </div>
                </div>

                {/* Cover Letter */}
                {application.cover_letter && (
                  <div className="space-y-2 pt-2 border-t border-[#f1f4f6]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                      Cover Letter
                    </h3>
                    <p className="text-xs text-[#41474d] whitespace-pre-line leading-relaxed bg-[#f7f9fb] p-4 rounded-2xl border border-[#e0e3e5]">
                      {application.cover_letter}
                    </p>
                  </div>
                )}

                {/* Additional Materials */}
                <div className="space-y-2 pt-2 border-t border-[#f1f4f6]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                    Supplemental Documents & Work Samples
                  </h3>
                  {application.materials?.length > 0 ? (
                    <div className="space-y-2">
                      {application.materials.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3.5 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[#191c1e] text-[10px] font-bold uppercase">
                              {m.file_type}
                            </span>
                            <span className="font-bold text-[#191c1e]">{m.file_name}</span>
                          </div>
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#71787e]">No extra documents submitted.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: ATS Resume Insights & Recruiter Notes (Figma Page 7) */}
          <div className="space-y-6">
            {/* Resume Insights Card (Figma Page 7) */}
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0058be]" />
                  <h3 className="font-bold text-sm text-[#191c1e]">Resume Insights</h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#71787e]">
                  Semantic Match
                </span>
              </div>

              {/* Match Score Display */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f0f4fd] border border-[#d0e1fd]">
                <div className="text-3xl font-black text-[#0058be]">
                  {ats.match_percentage !== undefined ? `${ats.match_percentage}%` : '85%'}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#191c1e] block">
                    {ats.match_label || 'Good Match'}
                  </span>
                  <p className="text-[11px] text-[#41474d] leading-tight">
                    {ats.semantic_analysis || 'Based on semantic analysis of job description and required competencies.'}
                  </p>
                </div>
              </div>

              {/* Matched Skills */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71787e] block">
                  Key Matched Skills ({ats.matched_skills?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ats.matched_skills?.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold"
                    >
                      ✓ {sk}
                    </span>
                  ))}
                  {(!ats.matched_skills || ats.matched_skills.length === 0) && (
                    <span className="text-[11px] text-[#71787e]">
                      No explicit required skills matched
                    </span>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              {ats.missing_skills?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#f1f4f6]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#ba1a1a] block">
                    Missing Target Skills ({ats.missing_skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ats.missing_skills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-[#ba1a1a] border border-rose-200 text-[11px] font-bold"
                      >
                        ✕ {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recruiter Notes Card (Figma Page 7) */}
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#0058be]" />
                  <h3 className="font-bold text-sm text-[#191c1e]">Recruiter Notes</h3>
                </div>
                <span className="text-xs text-[#71787e]">
                  {application.notes?.length || 0} notes
                </span>
              </div>

              {/* Notes Stream */}
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {application.notes?.length === 0 ? (
                  <p className="text-xs text-[#71787e] py-4 text-center">
                    No internal notes yet. Add thoughts below for your hiring team.
                  </p>
                ) : (
                  application.notes?.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#191c1e]">
                          {n.author_name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#71787e]">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                          {n.is_author && (
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-[#ba1a1a] hover:bg-rose-50 p-0.5 rounded transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[#41474d] leading-relaxed whitespace-pre-line">
                        {n.note}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Input Box (Figma Page 7) */}
              <form onSubmit={handleAddNote} className="pt-2 border-t border-[#f1f4f6] flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a quick note..."
                  className="flex-1 px-3 py-2 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !newNoteText.trim()}
                  className="p-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] disabled:opacity-50 text-white transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Viewer Modal (Figma Page 8) */}
      <RecruiterResumeViewerModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        application={application}
        onAdvance={() => {
          setResumeModalOpen(false);
          const nextStage = stages.find((s) => s.order > (currentStage.order || 0));
          if (nextStage) {
            handleStageMove(nextStage.id);
          } else {
            handleShortlist();
          }
        }}
        onAddNote={() => setResumeModalOpen(false)}
      />

      {/* Rejection Modal */}
      <RejectionReasonModal
        isOpen={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        candidateName={candidate.full_name}
        onConfirm={handleReject}
      />
    </RecruiterLayout>
  );
}
