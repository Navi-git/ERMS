import React from 'react';
import { X, Calendar, Clock, Video, MapPin, Users, BookOpen, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function InterviewBriefModal({ isOpen, onClose, interview }) {
  const { showToast } = useToast();

  if (!isOpen || !interview) return null;

  const dt = new Date(interview.scheduled_at);
  const formattedDate = dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyLink = () => {
    if (interview.meeting_link) {
      navigator.clipboard.writeText(interview.meeting_link);
      showToast('Meeting link copied to clipboard.', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{interview.interview_type_display}</h3>
              <p className="text-xs text-gray-500">
                {interview.job_title} • {interview.company_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Timing & Format */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date & Time
              </span>
              <p className="text-xs font-bold text-gray-900">{formattedDate}</p>
              <p className="text-[11px] text-gray-600">{formattedTime}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Duration & Format
              </span>
              <p className="text-xs font-bold text-gray-900">{interview.duration_minutes} minutes</p>
              <p className="text-[11px] text-gray-600">
                {interview.location || (interview.meeting_link ? 'Video Conference' : 'Phone Call')}
              </p>
            </div>
          </div>

          {/* Meeting Link / Location */}
          {interview.meeting_link && (
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Virtual Meeting Room</span>
                <p className="text-xs font-medium text-gray-900 truncate mt-0.5">{interview.meeting_link}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg bg-[#0058be] text-white text-xs font-bold hover:bg-[#004ca5] transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>Join Call</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Recruiter Notes */}
          {interview.invitation_note && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#0058be]" />
                Notes from Hiring Team
              </h4>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {interview.invitation_note}
              </div>
            </div>
          )}

          {/* Interviewers Panel */}
          {interview.interviewers && interview.interviewers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0058be]" />
                Interview Panel
              </h4>
              <div className="space-y-2">
                {interview.interviewers.map((panelist, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0058be] flex items-center justify-center font-bold text-xs uppercase">
                        {panelist.name ? panelist.name.charAt(0) : 'P'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{panelist.name}</p>
                        <p className="text-[11px] text-gray-500">{panelist.role || 'Interviewer'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Preparation Checklist */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Preparation Tips
            </h4>
            <ul className="text-[11px] text-emerald-800 space-y-1.5 pl-5 list-disc">
              <li>Test your camera and audio at least 10 minutes prior to call time.</li>
              <li>Have your portfolio, project case studies, or design artifacts ready to share screen.</li>
              <li>Ensure you have a quiet environment with stable internet connectivity.</li>
              <li>Prepare 2-3 thoughtful questions about the team, culture, and technical roadmap.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] transition-colors shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
