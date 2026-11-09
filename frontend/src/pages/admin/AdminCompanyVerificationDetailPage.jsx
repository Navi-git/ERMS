import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  ExternalLink,
  MessageSquare,
  Send,
  X,
  History,
  AlertCircle,
  Briefcase,
  Globe,
  MapPin,
  Users,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import adminApi from '../../api/adminApi';
import companyApi from '../../api/companyApi';
import { useToast } from '../../context/ToastContext';

export default function AdminCompanyVerificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  // Modals & Action States
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvalRiskLevel, setApprovalRiskLevel] = useState('LOW');
  const [approvalRiskScore, setApprovalRiskScore] = useState(5.0);
  const [approvalSuccessModalOpen, setApprovalSuccessModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Internal Notes State
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [internalNotesList, setInternalNotesList] = useState([]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCompanyDetail(id);
      setCompany(res.data);

      // Parse internal notes
      const notesRaw = res.data.verification?.internal_notes;
      if (notesRaw) {
        try {
          setInternalNotesList(JSON.parse(notesRaw));
        } catch {
          setInternalNotesList([{ note: notesRaw, author: 'Admin', timestamp: '' }]);
        }
      } else {
        setInternalNotesList([]);
      }
    } catch (err) {
      showToast('Failed to load company verification detail.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  // Start Review Action
  const handleStartReview = async () => {
    try {
      setProcessingAction(true);
      await adminApi.startCompanyReview(id);
      showToast('Review initiated. Application moved to Under Review.', 'success');
      loadDetail();
    } catch (err) {
      showToast('Failed to start review.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // Approve Action - Open Confirmation Modal
  const handleApprove = () => {
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    try {
      setProcessingAction(true);
      await adminApi.approveCompany(id, {
        risk_level: approvalRiskLevel,
        risk_score: parseFloat(approvalRiskScore) || 5.0,
      });
      setApproveModalOpen(false);
      setApprovalSuccessModalOpen(true);
      showToast('Company successfully verified and approved!', 'success');
      loadDetail();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to approve company.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // Reject Action
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      showToast('Please provide a specific rejection reason (at least 10 characters).', 'error');
      return;
    }

    try {
      setProcessingAction(true);
      await adminApi.rejectCompany(id, rejectionReason.trim());
      showToast('Company verification rejected. Notification recorded.', 'success');
      setRejectModalOpen(false);
      setRejectionReason('');
      loadDetail();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to reject verification.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // Save Internal Note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    try {
      setSavingNote(true);
      const res = await adminApi.saveCompanyNote(id, noteInput.trim());
      setInternalNotesList(res.data.notes || []);
      setNoteInput('');
      showToast('Internal note saved.', 'success');
    } catch (err) {
      showToast('Failed to save note.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // Download Compliance Document
  const handleDownloadDoc = async (docId, filename) => {
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#71787e]">Loading audit details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!company) {
    return (
      <AdminLayout>
        <div className="p-8 text-center space-y-4">
          <Building2 className="w-12 h-12 text-[#71787e] mx-auto opacity-50" />
          <h2 className="text-lg font-bold text-[#191c1e]">Company Not Found</h2>
          <Link to="/admin/companies" className="text-xs text-[#0058be] hover:underline font-semibold">
            Back to Queue
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const verif = company.verification || {};
  const status = company.verification_status;
  const isApproved = status === 'APPROVED';
  const isUnderReview = status === 'UNDER_REVIEW';
  const isPending = status === 'PENDING';
  const isRejected = status === 'REJECTED';

  const historyList = verif.review_history || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation (Figma Page 10) */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#71787e] tracking-wider uppercase">
          <Link to="/admin/companies" className="hover:text-[#191c1e]">
            Companies
          </Link>
          <span>/</span>
          <Link to="/admin/companies" className="hover:text-[#191c1e]">
            Verification Queue
          </Link>
          <span>/</span>
          <span className="text-[#0058be]">{company.name}</span>
        </div>

        {/* Top Audit Action Bar (Figma Page 10) */}
        <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-extrabold text-base shrink-0">
              {company.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#191c1e] tracking-tight">
                  {company.name}
                </h1>
                {isApproved && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    APPROVED
                  </span>
                )}
                {isUnderReview && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0058be] text-xs font-semibold border border-blue-200">
                    UNDER REVIEW
                  </span>
                )}
                {isPending && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                    PENDING VERIFICATION
                  </span>
                )}
                {isRejected && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                    REJECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71787e] mt-0.5">
                CRN: {company.registration_number || 'N/A'} • Tax ID: {company.tax_id || 'N/A'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              to="/admin/companies"
              className="px-4 py-2 border border-[#c3c7cb] text-xs font-semibold text-[#41474d] hover:bg-[#f1f4f6] rounded-xl transition-colors cursor-pointer"
            >
              Back
            </Link>

            {isPending && (
              <button
                type="button"
                onClick={handleStartReview}
                disabled={processingAction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Start Review
              </button>
            )}

            {!isRejected && (
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                disabled={processingAction}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Reject
              </button>
            )}

            {!isApproved && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={processingAction}
                className="px-5 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve Company</span>
              </button>
            )}
          </div>
        </div>

        {/* Rejection Notice Banner */}
        {isRejected && verif.rejection_reason && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-900">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-950">Application Rejected</p>
              <p className="mt-0.5">
                <strong>Rejection Reason:</strong> {verif.rejection_reason}
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Review Layout (Figma Page 10) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Company Overview, Recruitment Details, Compliance Docs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Overview Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2 border-b border-[#f1f4f6] pb-3">
                <Building2 className="w-4 h-4 text-[#0058be]" />
                <span>Company Overview</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#71787e] block">Registration Number (CRN)</span>
                  <span className="font-bold text-[#191c1e] text-sm">
                    {company.registration_number || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[#71787e] block">Tax ID (EIN)</span>
                  <span className="font-bold text-[#191c1e] text-sm">{company.tax_id || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[#71787e] block">Company Size</span>
                  <span className="font-bold text-[#191c1e]">{company.company_size || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[#71787e] block">Primary Industry</span>
                  <span className="font-bold text-[#191c1e]">
                    {company.industry?.value || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[#71787e] block">Headquarters</span>
                  <span className="font-bold text-[#191c1e]">
                    {[company.headquarters_address, company.city, company.state, company.country]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[#71787e] block">Website</span>
                  {company.website_url ? (
                    <a
                      href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0058be] hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <span>{company.website_url}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[#71787e]">Not provided</span>
                  )}
                </div>
              </div>
            </div>

            {/* Recruitment Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2 border-b border-[#f1f4f6] pb-3">
                <Briefcase className="w-4 h-4 text-[#0058be]" />
                <span>Recruitment Details</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#71787e] block">Intended Hiring Scale</span>
                  <span className="font-bold text-[#191c1e]">
                    {verif.intended_hiring_min && verif.intended_hiring_max
                      ? `${verif.intended_hiring_min} - ${verif.intended_hiring_max} roles / quarter`
                      : '50 - 100 roles / quarter'}
                  </span>
                </div>

                <div>
                  <span className="text-[#71787e] block mb-1.5">Key Focus Areas (Talent Tracks)</span>
                  {company.talent_tracks && company.talent_tracks.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {company.talent_tracks.map((t) => (
                        <span
                          key={t.id}
                          className="px-2.5 py-1 bg-[#e8f0fe] text-[#0058be] font-semibold rounded-lg text-xs"
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#71787e]">No specific talent tracks specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Documents Card (Figma Page 10) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <h2 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0058be]" />
                  <span>Verification Documents</span>
                </h2>
                <span className="text-xs text-[#71787e]">
                  {company.documents?.length || 0} Files Submitted
                </span>
              </div>

              {company.documents && company.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {company.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-[#191c1e] truncate" title={doc.original_filename}>
                            {doc.original_filename}
                          </p>
                          <p className="text-[10px] text-[#71787e] uppercase font-semibold mt-0.5">
                            {doc.document_type?.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] text-[#71787e] truncate mt-1">
                            SHA-256: {doc.checksum_sha256?.slice(0, 16)}...
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#e0e3e5] flex items-center justify-between text-xs">
                        <span className="text-[10px] text-[#71787e]">
                          {doc.is_current ? 'Current Active' : 'Archived Prior Revision'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc.id, doc.original_filename)}
                          className="px-3 py-1 bg-white border border-[#c3c7cb] hover:bg-slate-50 text-[#0058be] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#71787e] bg-[#f7f9fb] rounded-xl border border-dashed border-[#c3c7cb]">
                  No verification documents attached to this submission.
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col): Review History & Internal Notes */}
          <div className="space-y-6">
            {/* Review History Card (Figma Page 10) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2 border-b border-[#f1f4f6] pb-3">
                <History className="w-4 h-4 text-[#0058be]" />
                <span>Review History</span>
              </h3>

              {historyList.length > 0 ? (
                <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e0e3e5]">
                  {historyList.map((item, idx) => (
                    <div key={idx} className="relative text-xs space-y-0.5">
                      <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[#0058be] ring-4 ring-white" />
                      <p className="font-bold text-[#191c1e]">
                        {item.action?.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-[11px] text-[#71787e]">
                        {item.admin_name || item.by || 'System'}
                      </p>
                      {item.timestamp && (
                        <p className="text-[10px] text-[#71787e]">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      )}
                      {item.reason && (
                        <p className="text-[11px] text-red-600 font-medium pt-1">
                          Note: {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#71787e]">No audit actions recorded yet.</p>
              )}
            </div>

            {/* Internal Notes Card (Figma Page 10) */}
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2 border-b border-[#f1f4f6] pb-3">
                <MessageSquare className="w-4 h-4 text-[#0058be]" />
                <span>Internal Notes</span>
              </h3>

              {/* Add Note Form */}
              <form onSubmit={handleSaveNote} className="space-y-2">
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add a private note regarding this review..."
                  className="w-full px-3 py-2 bg-[#f7f9fb] border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-[#0058be] focus:bg-white leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={savingNote || !noteInput.trim()}
                  className="w-full py-2 bg-[#191c1e] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
                </button>
              </form>

              {/* Saved Notes List */}
              <div className="space-y-3 pt-2">
                {internalNotesList.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-[#71787e]">
                      <span className="font-bold text-[#191c1e]">{entry.author || 'Admin'}</span>
                      <span>
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[#41474d] text-[11px] leading-relaxed">{entry.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reject Reason Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e0e3e5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#191c1e]">Decline Verification</h3>
                    <p className="text-[11px] text-[#71787e]">Reason will be shared with the recruiter</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="p-1 text-[#71787e] hover:bg-[#f1f4f6] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. The submitted Certificate of Incorporation is blurry or missing State Charter seal. Please re-upload a clear copy."
                    className="w-full px-3 py-2 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-red-500 leading-relaxed"
                    required
                  />
                  <p className="text-[10px] text-[#71787e]">Minimum 10 characters required.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f4f6]">
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#41474d] hover:bg-[#f1f4f6] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction || rejectionReason.trim().length < 10}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {processingAction ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal for Verification Approval */}
        {approveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e0e3e5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#191c1e]">Approve Enterprise Verification</h3>
                    <p className="text-[11px] text-[#71787e]">{company?.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="p-1 text-[#71787e] hover:bg-[#f1f4f6] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-[#41474d] leading-relaxed">
                  Approving this application marks <strong className="text-[#191c1e]">{company?.name}</strong> as an authenticated employer organization. This will grant full enterprise access, activate job posting capabilities, and display a verified badge to candidates.
                </p>

                {/* Risk Level Selector */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-[#191c1e]">Assessed Risk Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['LOW', 'MEDIUM', 'HIGH'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setApprovalRiskLevel(lvl)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          approvalRiskLevel === lvl
                            ? lvl === 'LOW'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : lvl === 'MEDIUM'
                              ? 'bg-amber-50 border-amber-500 text-amber-800'
                              : 'bg-red-50 border-red-500 text-red-800'
                            : 'bg-white border-[#e0e3e5] text-[#71787e] hover:bg-slate-50'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f1f4f6]">
                  <button
                    type="button"
                    onClick={() => setApproveModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#41474d] hover:bg-[#f1f4f6] rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApprove}
                    disabled={processingAction}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{processingAction ? 'Approving...' : 'Confirm & Approve'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Beautiful Success Alert Dialog with OK Confirmation Button */}
        {approvalSuccessModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-emerald-100 p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-[#191c1e]">
                  Verification Approved!
                </h3>
                <p className="text-xs text-[#71787e] leading-relaxed">
                  <strong className="text-[#191c1e]">{company?.name}</strong> has been successfully verified. Their recruiter accounts now have full enterprise access and verified employer status.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalSuccessModalOpen(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

