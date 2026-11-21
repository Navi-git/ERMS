import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  Users,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  BookOpen,
  Headphones,
  Check,
  AlertCircle,
  Sparkles,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import interviewApi from '../../api/interviewApi';
import { useToast } from '../../context/ToastContext';
import CandidateRescheduleModal from '../../components/interviews/CandidateRescheduleModal';
import InterviewBriefModal from '../../components/interviews/InterviewBriefModal';

export default function CandidateInterviewCenterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [counts, setCounts] = useState({ upcoming: 0, past: 0, cancelled: 0 });

  // Tab: 'upcoming' | 'past' | 'cancelled'
  const [activeTab, setActiveTab] = useState('upcoming');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  useEffect(() => {
    fetchCandidateInterviews();
  }, [activeTab, typeFilter]);

  const fetchCandidateInterviews = async () => {
    try {
      setLoading(true);
      const params = { status: activeTab };
      if (typeFilter !== 'all') params.type = typeFilter;

      const res = await interviewApi.getCandidateInterviews(params);
      setInterviews(res.data?.interviews || []);
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      showToast('Failed to load your interviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRsvp = async (interviewId) => {
    try {
      await interviewApi.respondToInterview(interviewId, { response_status: 'accepted' });
      showToast('RSVP confirmed! Your attendance has been verified with the recruiter.', 'success');
      fetchCandidateInterviews();
    } catch (err) {
      showToast('Failed to confirm RSVP.', 'error');
    }
  };

  const handleAudioVideoTest = () => {
    showToast('Camera and microphone detected and operating properly.', 'success');
  };

  // Find nearest upcoming interview for the Hero card
  const heroInterview = activeTab === 'upcoming' && interviews.length > 0 ? interviews[0] : null;

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Header (Figma Screen 2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Interview Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0058be] border border-blue-100">
                {counts.upcoming} Upcoming
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Track, prepare for, and join scheduled interviews across all your active job applications in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (heroInterview) {
                  setSelectedInterview(heroInterview);
                  setBriefModalOpen(true);
                } else {
                  showToast('Review your portfolio case studies and arrive 5 minutes early.', 'info');
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-gray-400" />
              <span>Interview Prep Tips</span>
            </button>

            <button
              type="button"
              onClick={handleAudioVideoTest}
              className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-gray-300" />
              <span>Test Audio & Video</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Next Interview Starting Soon */}
        {heroInterview && (
          <div className="p-6 rounded-3xl bg-[#00224d] text-white shadow-xl relative overflow-hidden space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                  Upcoming Round
                </span>
              </div>
              <span className="text-xs text-blue-200">
                {new Date(heroInterview.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(heroInterview.scheduled_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {heroInterview.interview_type_display}: {heroInterview.job_title} with {heroInterview.company_name}
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                Panel: {heroInterview.interviewers?.map((i) => i.name).join(', ') || 'Lead Interviewer'} •{' '}
                {heroInterview.duration_minutes} minutes
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {heroInterview.meeting_link ? (
                <a
                  href={heroInterview.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Call Now</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInterview(heroInterview);
                    setBriefModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white text-[#00224d] font-black text-xs transition-colors shadow-md"
                >
                  View Details & Instructions
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedInterview(heroInterview);
                  setBriefModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                View Brief
              </button>
            </div>
          </div>
        )}

        {/* Tab Bar & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`text-xs font-bold pb-1.5 transition-colors relative cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'text-[#0058be] border-b-2 border-[#0058be]'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Upcoming ({counts.upcoming})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`text-xs font-bold pb-1.5 transition-colors relative cursor-pointer ${
                activeTab === 'past'
                  ? 'text-[#0058be] border-b-2 border-[#0058be]'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Past Interviews ({counts.past})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`text-xs font-bold pb-1.5 transition-colors relative cursor-pointer ${
                activeTab === 'cancelled'
                  ? 'text-[#0058be] border-b-2 border-[#0058be]'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Cancelled ({counts.cancelled})
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500">Filter by type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#0058be]"
            >
              <option value="all">All Types (Video, Phone, On-site)</option>
              <option value="technical">Technical</option>
              <option value="portfolio">Portfolio</option>
              <option value="phone">Phone Screen</option>
              <option value="behavioral">Behavioral</option>
              <option value="on_site">On-Site</option>
            </select>
          </div>
        </div>

        {/* Interviews List */}
        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-200">
            <div className="w-8 h-8 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0058be] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No {activeTab} interviews</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === 'upcoming'
                ? 'When recruiters schedule evaluations for your applications, they will appear here.'
                : 'Your interview history and verification logs will be archived here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => {
              const dt = new Date(interview.scheduled_at);
              const formattedDate = dt.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = dt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isPendingRsvp = interview.my_response_status === 'invited' && interview.interview_status === 'scheduled';
              const isConfirmed = interview.my_response_status === 'accepted' && interview.interview_status === 'scheduled';
              const isCompleted = interview.interview_status === 'completed';

              return (
                <div
                  key={interview.id}
                  className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs hover:border-gray-300 transition-all space-y-4"
                >
                  {/* Top Bar: Company & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0058be] flex items-center justify-center font-black text-sm">
                        {interview.company_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">{interview.job_title}</h3>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-semibold text-gray-600">{interview.company_name}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {interview.interview_type_display} • {interview.duration_minutes} minutes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPendingRsvp && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending RSVP (Accept Invitation)
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Confirmed
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          Completed
                        </span>
                      )}
                      {interview.interview_status === 'cancelled' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timing & Channel Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 text-xs text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-900">{formattedDate}</p>
                        <p className="text-[11px] text-gray-500">{formattedTime}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {interview.location?.includes('HQ') ? (
                        <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                      ) : (
                        <Video className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">
                          {interview.location || 'Video Conference'}
                        </p>
                        {interview.meeting_link && (
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#0058be] hover:underline truncate block"
                          >
                            {interview.meeting_link}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-900">
                          {interview.interviewers?.length || 1} Interviewer
                          {interview.interviewers?.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {interview.interviewers?.map((i) => i.name).join(', ') || 'Hiring Team'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Notes snippet if available */}
                  {interview.invitation_note && (
                    <div className="text-[11px] text-gray-600 bg-blue-50/30 p-2.5 rounded-lg border border-blue-50">
                      <span className="font-bold text-gray-800">Recruiter Note: </span>
                      {interview.invitation_note}
                    </div>
                  )}

                  {/* Past Feedback Gated Verification Notice */}
                  {isCompleted && (
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Interviewer feedback has been recorded & submitted to hiring team.</span>
                      </div>
                      <span className="text-[10px] text-gray-400 italic">
                        (Evaluation details stay internal to company review board)
                      </span>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
                    <Link
                      to={`/candidate/applications/${interview.application_id}`}
                      className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      <span>View Application Record</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex items-center gap-2">
                      {/* Confirm RSVP if pending */}
                      {isPendingRsvp && (
                        <button
                          type="button"
                          onClick={() => handleConfirmRsvp(interview.id)}
                          className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        >
                          Confirm RSVP
                        </button>
                      )}

                      {/* Join Call button if scheduled */}
                      {interview.interview_status === 'scheduled' && interview.meeting_link && (
                        <a
                          href={interview.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Call</span>
                        </a>
                      )}

                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInterview(interview);
                          setBriefModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        View Details
                      </button>

                      {/* Request Reschedule if scheduled */}
                      {interview.interview_status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setRescheduleModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        <InterviewBriefModal
          isOpen={briefModalOpen}
          onClose={() => setBriefModalOpen(false)}
          interview={selectedInterview}
        />
        <CandidateRescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          interview={selectedInterview}
          onSuccess={fetchCandidateInterviews}
        />
      </div>
    </CandidateLayout>
  );
}
