import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Award,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import applicationApi from '../../api/applicationApi';
import interviewApi from '../../api/interviewApi';
import offerApi from '../../api/offerApi';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { resolvePhotoUrl } from '../../utils/imageUrl';
import MarkdownContent from '../../components/common/MarkdownContent';

export default function CandidateApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { subscribe, markAsRead, recentNotifications } = useNotifications();

  const [application, setApplication] = useState(null);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  // New Material form state
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('portfolio');
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [activeInterview, setActiveInterview] = useState(null);
  const [concludedInterview, setConcludedInterview] = useState(null);

  const fetchApplicationDetail = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await applicationApi.getCandidateApplicationDetail(id);
      setApplication(res.data);

      // Fetch matching interview if scheduled or active
      try {
        const invRes = await interviewApi.getCandidateInterviews({ application_id: id });
        const appInterviews = (invRes.data?.interviews || []).filter(
          (inv) => Number(inv.application_id) === Number(id)
        );

        const now = Date.now();
        // Check for active upcoming interview:
        // Must be scheduled, candidate hasn't declined, and scheduled end time is in future
        const upcoming = appInterviews.find((inv) => {
          if (inv.interview_status !== 'scheduled') return false;
          if (inv.my_response_status === 'declined') return false;
          if (inv.has_ended) return false;
          const endMs = new Date(inv.scheduled_at).getTime() + (inv.duration_minutes || 60) * 60 * 1000;
          return endMs > now;
        });

        // Check for most recent completed or past interview
        const concluded = appInterviews.find((inv) => {
          if (inv.interview_status === 'completed') return true;
          if (inv.has_ended) return true;
          const endMs = new Date(inv.scheduled_at).getTime() + (inv.duration_minutes || 60) * 60 * 1000;
          return endMs <= now;
        });

        setActiveInterview(upcoming || null);
        setConcludedInterview(concluded || null);
      } catch {
        // Non-fatal
      }

      // Fetch formal offer if in offer or hired stage
      try {
        const offRes = await offerApi.getCandidateApplicationOffer(id);
        setOffer(offRes.data?.offer || null);
      } catch {
        // Non-fatal
      }
    } catch (err) {
      if (!isSilent) {
        showToast('Application not found or access denied.', 'error');
        navigate('/candidate/applications');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchApplicationDetail(false);
  }, [fetchApplicationDetail]);

  // Real-time automatic status updates for this application
  useEffect(() => {
    const handleUpdate = (payload) => {
      const isMatch =
        (payload?.type === 'application.update' && String(payload?.data?.application_id) === String(id)) ||
        (payload?.type === 'notification.alert' &&
          payload?.data?.source_type === 'application' &&
          String(payload?.data?.source_id) === String(id));

      if (isMatch) {
        fetchApplicationDetail(true);
      }
    };

    const unsubscribe = subscribe ? subscribe(handleUpdate) : () => {};

    const handleWindowEvent = (e) => {
      if (e.detail && String(e.detail.application_id) === String(id)) {
        fetchApplicationDetail(true);
      }
    };
    window.addEventListener('erms:application.update', handleWindowEvent);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchApplicationDetail(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener('erms:application.update', handleWindowEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, subscribe, fetchApplicationDetail]);

  // Automatically mark unread notification for this application as read when viewed
  const markedNotificationIdsRef = useRef(new Set());
  useEffect(() => {
    if (recentNotifications && recentNotifications.length > 0) {
      recentNotifications.forEach((notif) => {
        if (
          !notif.is_read &&
          notif.source_type === 'application' &&
          String(notif.source_id) === String(id) &&
          !markedNotificationIdsRef.current.has(notif.id)
        ) {
          markedNotificationIdsRef.current.add(notif.id);
          markAsRead(notif.id);
        }
      });
    }
  }, [id, recentNotifications, markAsRead]);

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

  const getStatusBadge = (status, currentStage) => {
    const stage = currentStage || application?.current_stage;
    const stageName = stage?.name || '';
    const stageType = stage?.type || '';

    // If stage is screening or reviewing in screening stage, display as SCREENING
    if (
      status === 'screening' ||
      stageType === 'screening' ||
      stageName.toLowerCase() === 'screening' ||
      (status === 'reviewing' && (!stageName || stageName.toLowerCase() === 'screening'))
    ) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          SCREENING
        </span>
      );
    }
    if (status === 'reviewing' && stageName) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          {stageName.toUpperCase()}
        </span>
      );
    }
    switch (status) {
      case 'applied':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0058be] border border-blue-200">APPLIED</span>;
      case 'reviewing':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">SCREENING</span>;
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
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-[#71787e]">{stageName ? stageName.toUpperCase() : status?.toUpperCase()}</span>;
    }
  };

  const appStatus = application?.application_status;
  const isOfferStage = appStatus === 'offer_sent' || application?.current_stage?.type === 'offer';
  const isHiredStage = appStatus === 'accepted' || application?.current_stage?.type === 'hired';
  const isPostInterviewStage = isOfferStage || isHiredStage || ['rejected', 'withdrawn'].includes(appStatus);

  // Check if an interview stage is marked as completed in the pipeline stepper
  const isInterviewStageCompleted = application?.pipeline_stepper?.some(
    (step) => step.type === 'interview' && step.is_completed && !step.is_current
  );

  // Active upcoming interview banner should ONLY show when:
  // 1. Not in a post-interview stage (offer, hired, rejected, withdrawn)
  // 2. Active upcoming interview exists, is scheduled, and has not ended
  // 3. Application is still in active interview stage
  const shouldShowActiveInterviewBanner =
    !isPostInterviewStage &&
    !isInterviewStageCompleted &&
    appStatus === 'interview_scheduled' &&
    Boolean(activeInterview);

  // Concluded interview notice:
  // Show when the candidate attended or meeting elapsed, but before recruiter moves to offer/next stage
  const shouldShowConcludedNotice =
    !isPostInterviewStage &&
    !shouldShowActiveInterviewBanner &&
    appStatus === 'interview_scheduled' &&
    Boolean(concludedInterview);

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
                  {getStatusBadge(application.application_status, application.current_stage)}
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

          {/* Offer Extended Banner */}
          {isOfferStage && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-100">
                  <Award className="w-4 h-4 text-white" />
                  <span>Offer Stage Reached</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 text-white">
                  Active Update
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Congratulations! You've received an offer</h3>
                <p className="text-xs text-amber-50 mt-1 max-w-xl leading-relaxed">
                  The hiring team at <span className="font-semibold text-white">{application.company_name}</span> has extended a formal employment offer for <span className="font-semibold text-white">{application.job_title}</span>. Review your complete compensation breakdown and respond before the expiration deadline.
                </p>
              </div>

              {offer && (
                <div className="p-3.5 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-white text-sm">
                      ${(offer.salary || 0).toLocaleString()} {offer.currency || 'USD'}
                    </span>
                    <span className="text-amber-100">
                      • {offer.pay_frequency?.replace('_', ' ') || 'Annual'}
                    </span>
                    {offer.expiration_date && (
                      <span className="text-amber-200 text-[11px]">
                        • Expiration: {new Date(offer.expiration_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {offer.offer_document_url && (
                    <a
                      href={offer.offer_document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Offer Letter (.PDF)</span>
                    </a>
                  )}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/candidate/applications/${id}/offer`)}
                  className="px-5 py-2.5 rounded-xl bg-white text-amber-900 text-xs font-bold hover:bg-amber-50 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Review & Respond to Formal Offer</span>
                </button>
              </div>
            </div>
          )}

          {/* Hired Confirmation Banner */}
          {isHiredStage && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Hiring Confirmed</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 text-white">
                  Completed
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Welcome to the Team!</h3>
                <p className="text-xs text-emerald-50 mt-1 max-w-xl leading-relaxed">
                  Your offer acceptance has been recorded for <span className="font-semibold text-white">{application.job_title}</span> at <span className="font-semibold text-white">{application.company_name}</span>. The talent team will coordinate your upcoming onboarding journey.
                </p>
              </div>
            </div>
          )}

          {/* Interview Concluded / Under Review Notice */}
          {shouldShowConcludedNotice && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{concludedInterview?.interview_type_display || 'Interview Round'} Concluded</span>
                </div>
                <Link
                  to="/candidate/interviews"
                  className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-1"
                >
                  <span>Interview Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Your interview session has concluded. The hiring team is reviewing evaluation scorecards from the interviewers and calibrating feedback. You will receive an update as soon as the review is complete.
              </p>
            </div>
          )}

          {/* Active Focus Card (Figma Screen 1: Interview Banner - Only when interview is active & upcoming) */}
          {shouldShowActiveInterviewBanner && (
            <div className="p-6 rounded-2xl bg-[#002a64] text-white space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">
                  Active Focus
                </span>
                <span className="flex items-center gap-1.5 text-xs text-blue-200">
                  <Video className="w-4 h-4" />
                  {activeInterview?.location || 'Live Video Meeting'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {activeInterview?.interview_type_display || 'Technical Interview'}
                </h3>
                <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
                  {activeInterview?.invitation_note ||
                    'Deep dive into portfolio case studies, technical architecture, and system design process.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-blue-900/60 pt-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block">
                    Scheduled Time
                  </span>
                  <span className="text-sm font-black text-white">
                    {activeInterview?.scheduled_at
                      ? `${new Date(activeInterview.scheduled_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} at ${new Date(activeInterview.scheduled_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Upcoming Time Slot'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeInterview?.meeting_link ? (
                    <a
                      href={activeInterview.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-white text-[#002a64] font-black text-xs hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <Video className="w-4 h-4 text-[#0058be]" />
                      <span>Join Call</span>
                    </a>
                  ) : (
                    <Link
                      to="/candidate/interviews"
                      className="px-5 py-2.5 rounded-xl bg-white text-[#002a64] font-black text-xs hover:bg-blue-50 transition-colors shadow-xs"
                    >
                      View in Interview Center
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recruiter Notes Card (Figma Screen 1 - Only when interview is active & upcoming) */}
          {shouldShowActiveInterviewBanner && activeInterview?.invitation_note && (
            <div className="p-5 rounded-2xl bg-white border border-[#e0e3e5] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#71787e]">
                <span className="font-bold uppercase tracking-wider text-[11px] text-[#191c1e]">
                  Recruiter Notes
                </span>
                <span>Active Round Note</span>
              </div>
              <p className="text-xs text-[#41474d] leading-relaxed bg-[#f7f9fb] p-3.5 rounded-xl border border-gray-100">
                {activeInterview.invitation_note}
              </p>
            </div>
          )}

          {/* Hiring Pipeline Progress Stepper (Figma Page 5) */}
          <div className="pt-4 border-t border-[#f1f4f6] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71787e] block">
              Hiring Pipeline Progress
            </span>

            <div
              className={`grid gap-3 ${
                (application.pipeline_stepper?.length || 0) === 1
                  ? 'grid-cols-1'
                  : (application.pipeline_stepper?.length || 0) === 2
                  ? 'grid-cols-2'
                  : (application.pipeline_stepper?.length || 0) === 3
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : (application.pipeline_stepper?.length || 0) === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : (application.pipeline_stepper?.length || 0) === 5
                  ? 'grid-cols-2 sm:grid-cols-5'
                  : (application.pipeline_stepper?.length || 0) === 6
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              }`}
            >
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

              {/* Formal Offer Letter Document */}
              {offer && (
                <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs mb-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">
                          Official Offer Letter ({offer.offer_reference || 'REF'})
                        </p>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {offer.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ${(offer.salary || 0).toLocaleString()} {offer.currency || 'USD'} • Formal Employment Agreement
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.offer_document_url && (
                      <a
                        href={offer.offer_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/candidate/applications/${id}/offer`)}
                      className="px-3 py-1.5 rounded-lg bg-[#0058be] text-white font-bold text-xs hover:bg-[#004ca5] transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )}

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
                    <div className="text-xs text-[#41474d] leading-relaxed">
                      <MarkdownContent content={application.cover_letter} />
                    </div>
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

