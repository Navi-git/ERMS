import React, { useState } from 'react';
import { X, Calendar, MessageSquare, Clock } from 'lucide-react';
import interviewApi from '../../api/interviewApi';
import { useToast } from '../../context/ToastContext';

export default function CandidateRescheduleModal({ isOpen, onClose, interview, onSuccess }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [preferredSlots, setPreferredSlots] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !interview) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a reason for the reschedule request.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await interviewApi.requestReschedule(interview.id, {
        reason: reason.trim(),
        preferred_slots: preferredSlots.trim(),
      });
      showToast('Reschedule request sent to the recruiting team.', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit reschedule request.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0058be]/10 text-[#0058be] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Request Reschedule</h3>
              <p className="text-xs text-gray-500">
                {interview.job_title} • {interview.interview_type_display}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Let the hiring team know why you need to reschedule and suggest times that work better for you.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              Reason for Request <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Schedule conflict with another commitment, unexpected emergency..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Your Availability / Preferred Slots (Optional)
            </label>
            <input
              type="text"
              value={preferredSlots}
              onChange={(e) => setPreferredSlots(e.target.value)}
              placeholder="e.g. Tomorrow afternoon, Friday after 2 PM EST..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
