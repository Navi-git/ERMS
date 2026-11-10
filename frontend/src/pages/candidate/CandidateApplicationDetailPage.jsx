import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  FileText,
  Paperclip,
  ExternalLink,
  Download,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  Video,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import applicationApi from '../../api/applicationApi';
import { useToast } from '../../context/ToastContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';

export default function CandidateApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  // New Material form state
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('portfolio');
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);

  useEffect(() => {
    fetchApplicationDetail();
  }, [id]);

  const fetchApplicationDetail = async () => {
    setLoading(true);
    try {
      const res = await applicationApi.getCandidateApplicationDetail(id);
      setApplication(res.data);
    } catch (err) {
      showToast('Application not found or access denied.', 'error');
      navigate('/candidate/applications');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await applicationApi.withdrawApplication(id);
      showToast(res.data.message || 'Application withdrawn.', 'info');
      setShowWithdrawConfirm(false);
      fetchApplicationDetail();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to withdraw application.', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialName.trim() || !newMaterialUrl.trim()) {
      showToast('Please provide both material title and URL.', 'info');
      return;
    }

    setAddingMaterial(true);
    try {
      await applicationApi.addApplicationMaterial(id, {
        file_name: newMaterialName.trim(),
        file_url: newMaterialUrl.trim(),
        file_type: newMaterialType,
      });
      showToast('Material added to your application.', 'success');
      setNewMaterialName('');
      setNewMaterialUrl('');
      setShowAddMaterialModal(false);
      fetchApplicationDetail();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add material.', 'error');
    } finally {
      setAddingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    try {
      await applicationApi.deleteApplicationMaterial(id, materialId);
      showToast('Material removed.', 'info');
      fetchApplicationDetail();
    } catch (err) {
      showToast('Failed to delete material.', 'error');
    }
  };

  if (loading) {
    return (
      <CandidateLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
          <p className="text-xs text-[#71787e]">Loading application details...</p>
        </div>
      </CandidateLayout>
    );
  }

  if (!application) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'applied':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0058be] border border-blue-200">APPLIED</span>;
      case 'reviewing':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">IN REVIEW</span>;
      case 'shortlisted':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">SHORTLISTED</span>;
      case 'interview_scheduled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">INTERVIEW SCHEDULED</span>;
      case 'offer_sent':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">OFFER EXTENDED</span>;
      case 'accepted':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">HIRED</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-[#ba1a1a] border border-rose-200">NOT SELECTED</span>;
      case 'withdrawn':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-[#71787e] border border-slate-200">WITHDRAWN</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-[#71787e]">{status?.toUpperCase()}</span>;
    }
  };

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#71787e]">
          <Link
            to="/candidate/applications"
            className="hover:text-[#0058be] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Applications</span>
          </Link>
          <span>/</span>
          <span className="text-[#191c1e] font-bold">{application.job_title}</span>
        </div>

        {/* Top Header Card (Figma Page 5) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] flex items-center justify-center shrink-0 overflow-hidden text-[#0058be] font-bold">
                {application.company_logo ? (
                  <img
                    src={resolvePhotoUrl(application.company_logo)}
                    alt={application.company_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-7 h-7 text-[#71787e]" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl font-black text-[#191c1e] tracking-tight">
                    {application.job_title}
                  </h1>
                  {getStatusBadge(application.application_status)}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#71787e]">
                  <span className="font-semibold text-[#191c1e]">{application.company_name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {application.location || 'Remote'} ({application.employment_type?.replace('_', ' ') || 'Full-time'})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Applied {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3 self-start">
              {/* Message Recruiter Button (Figma Page 5) */}
              <button
                type="button"
                onClick={() =>
                  showToast('Direct recruiter chat will be activated in the upcoming Messaging module.', 'info')
                }
                className="px-4 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-[#0058be]" />
                <span>Message Recruiter</span>
              </button>

              {/* Withdraw Button (Decision #1) */}
              {application.can_withdraw && (
                <button
                  type="button"
                  onClick={() => setShowWithdrawConfirm(true)}
                  className="px-4 py-2.5 rounded-xl border border-[#ba1a1a]/40 text-[#ba1a1a] hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>

          {/* Rejection Feedback Box (Decision #7) */}
          {application.application_status === 'rejected' && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-[#ba1a1a]" />
                <span>Feedback from Hiring Team</span>
              </div>
              <p className="text-xs text-rose-950 leading-relaxed font-medium">
                {application.rejection_reason || 'Thank you for your application. Unfortunately, this position was filled or other candidates closely matched requirements.'}
              </p>
            </div>
          )}

          {/* Active Focus Card (Figma Page 5: Interview Banner) */}
          {application.application_status === 'interview_scheduled' && (
            <div className="p-6 rounded-2xl bg-[#002a64] text-white space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">
                  Active Focus
                </span>
                <span className="flex items-center gap-1.5 text-xs text-blue-200">
                  <Video className="w-4 h-4" />
                  Live Meeting
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Upcoming Interview Round</h3>
                <p className="text-xs text-blue-100 mt-1 max-w-xl">
                  Your interview has been scheduled with the engineering panel. Review your portfolio projects and technical architecture case studies.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    showToast('Virtual meeting room will open 10 minutes prior to call time in the Interview module.', 'info')
                  }
                  className="px-5 py-2.5 rounded-xl bg-white text-[#0058be] font-bold text-xs hover:bg-blue-50 transition-colors shadow-xs cursor-pointer"
                >
                  Join Call (Upcoming)
                </button>
              </div>
            </div>
          )}

          {/* Hiring Pipeline Progress Stepper (Figma Page 5) */}
          <div className="pt-4 border-t border-[#f1f4f6] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e] block">
              Hiring Pipeline Progress
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {application.pipeline_stepper?.map((step) => {
                const isCompleted = step.is_completed;
                const isCurrent = step.is_current;
                return (
                  <div
                    key={step.id}
                    className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition-all ${
                      isCurrent
                        ? 'border-[#0058be] bg-[#f0f4fd] ring-2 ring-[#0058be]/20'
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-[#e0e3e5] bg-[#f7f9fb] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-center mx-auto">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-[#0058be] text-white text-xs font-bold flex items-center justify-center">
                          {step.order}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#c1c7ce] text-white text-xs font-bold flex items-center justify-center">
                          {step.order}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#191c1e] truncate">{step.name}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block text-[#71787e]">
                      {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2 Columns: Application Materials & Pitch (Figma Page 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Materials & Cover Letter */}
          <div className="lg:col-span-2 space-y-6">
            {/* Submitted Resume (Figma Page 5) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0058be]" />
                  <h3 className="font-bold text-sm text-[#191c1e]">Attached Resume</h3>
                </div>
                {application.resume?.file_url && (
                  <a
                    href={application.resume.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#0058be] hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>

              {application.resume ? (
                <div className="flex items-center justify-between p-4 bg-[#f7f9fb] border border-[#e0e3e5] rounded-2xl text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e0e3e5] flex items-center justify-center text-[#0058be]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#191c1e]">
                        {application.resume.title}
                      </p>
                      <p className="text-[11px] text-[#71787e]">
                        {application.resume.file_size
                          ? `${Math.round(application.resume.file_size / 1024)} KB`
                          : 'PDF'}{' '}
                        • Uploaded {new Date(application.resume.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#71787e]">No resume record attached.</p>
              )}
            </div>

            {/* Supplemental Materials (Figma Page 5) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#0058be]" />
                  <h3 className="font-bold text-sm text-[#191c1e]">Submitted Materials</h3>
                </div>
                {application.materials?.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAddMaterialModal(true)}
                    className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Material</span>
                  </button>
                )}
              </div>

              {application.materials?.length > 0 ? (
                <div className="space-y-2.5">
                  {application.materials.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-[#0058be]" />
                        <div>
                          <p className="font-bold text-[#191c1e]">{m.file_name}</p>
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#0058be] hover:underline flex items-center gap-1"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="p-1 rounded-md text-[#ba1a1a] hover:bg-rose-50 transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#71787e]">
                  No supplemental portfolio items or certifications attached.
                </p>
              )}
            </div>

            {/* Candidate Cover Letter & Pitch */}
            {(application.message_to_hiring_manager || application.cover_letter) && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e0e3e5] shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-[#191c1e] border-b border-[#f1f4f6] pb-3">
                  Pitch to Hiring Manager
                </h3>
                {application.message_to_hiring_manager && (
                  <div>
                    <span className="text-[11px] font-bold text-[#71787e] uppercase tracking-wider block mb-1">
                      Highlight Note
                    </span>
                    <p className="text-xs text-[#191c1e] italic bg-[#f7f9fb] p-3 rounded-xl border border-[#e0e3e5]">
                      "{application.message_to_hiring_manager}"
                    </p>
                  </div>
                )}
                {application.cover_letter && (
                  <div>
                    <span className="text-[11px] font-bold text-[#71787e] uppercase tracking-wider block mb-1">
                      Cover Letter
                    </span>
                    <p className="text-xs text-[#41474d] whitespace-pre-line leading-relaxed">
                      {application.cover_letter}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Job Snapshot & Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#191c1e] border-b border-[#f1f4f6] pb-3">
                Position Overview
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#71787e] font-medium block">Job Requisition:</span>
                  <span className="font-bold text-[#191c1e]">{application.job_title}</span>
                </div>
                <div>
                  <span className="text-[#71787e] font-medium block">Company:</span>
                  <span className="font-bold text-[#191c1e]">{application.company_name}</span>
                </div>
                <div>
                  <span className="text-[#71787e] font-medium block">Location:</span>
                  <span className="font-bold text-[#191c1e]">
                    {application.location || 'Remote'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71787e] font-medium block">Employment Type:</span>
                  <span className="font-bold text-[#191c1e] capitalize">
                    {application.employment_type?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#f1f4f6]">
                <Link
                  to={`/jobs/${application.job_id}`}
                  className="w-full py-2.5 rounded-xl border border-[#0058be] text-[#0058be] hover:bg-[#f0f4fd] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>View Original Listing</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-[#e0e3e5]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ba1a1a] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#191c1e]">Withdraw Application?</h3>
              <p className="text-xs text-[#71787e] mt-1">
                Are you sure you want to withdraw from consideration for{' '}
                <span className="font-semibold text-[#191c1e]">{application.job_title}</span>? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={withdrawing}
                onClick={handleWithdraw}
                className="flex-1 py-2.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold"
              >
                {withdrawing ? 'Withdrawing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#e0e3e5]">
            <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
              <h3 className="font-bold text-base text-[#191c1e]">Add Application Material</h3>
              <button
                onClick={() => setShowAddMaterialModal(false)}
                className="p-1 rounded-full text-[#71787e] hover:bg-[#f1f4f6]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#41474d] block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="e.g. Design Portfolio Figma File"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#41474d] block mb-1">Material Type</label>
                <select
                  value={newMaterialType}
                  onChange={(e) => setNewMaterialType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
                >
                  <option value="portfolio">Portfolio</option>
                  <option value="certificate">Certificate</option>
                  <option value="assignment">Assignment</option>
                  <option value="link">External Link</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#41474d] block mb-1">URL Link *</label>
                <input
                  type="url"
                  required
                  value={newMaterialUrl}
                  onChange={(e) => setNewMaterialUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#0058be] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#71787e] hover:bg-[#f1f4f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMaterial}
                  className="px-4 py-2 rounded-xl bg-[#0058be] text-white text-xs font-bold hover:bg-[#004ca5]"
                >
                  {addingMaterial ? 'Adding...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CandidateLayout>
  );
}

