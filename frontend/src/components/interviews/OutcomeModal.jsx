import React, { useState } from 'react';
import { X, CheckCircle2, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import interviewApi from '../../api/interviewApi';
import { useToast } from '../../context/ToastContext';

export default function OutcomeModal({ isOpen, onClose, interview, onSuccess }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState('completed');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !interview) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await interviewApi.markOutcome(interview.id, {
        outcome,
        notes: notes.trim(),
      });

      if (outcome === 'completed') {
        showToast('Interview marked as completed. Awaiting scorecard evaluation.', 'success');
        onSuccess?.();
        onClose();
        // Prompt to fill scorecard
        navigate(`/recruiter/interviews/${interview.id}/scorecard`);
      } else {
        showToast('Candidate recorded as No-Show.', 'info');
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record outcome.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Record Interview Outcome</h3>
            <p className="text-xs text-gray-500">
              {interview.candidate?.full_name || 'Candidate'} • {interview.interview_type_display}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome('completed')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                outcome === 'completed'
                  ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 mb-2 ${outcome === 'completed' ? 'text-emerald-600' : 'text-gray-400'}`}
              />
              <span className="block text-sm font-bold text-gray-900">Completed</span>
              <span className="block text-[11px] text-gray-500 mt-0.5">Session held as scheduled</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('no_show')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                outcome === 'no_show'
                  ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <UserX
                className={`w-5 h-5 mb-2 ${outcome === 'no_show' ? 'text-amber-600' : 'text-gray-400'}`}
              />
              <span className="block text-sm font-bold text-gray-900">No-Show</span>
              <span className="block text-[11px] text-gray-500 mt-0.5">Candidate missed call</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Outcome Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                outcome === 'completed'
                  ? 'e.g. Great session, covered technical design...'
                  : 'e.g. Tried calling, no response after 15 minutes...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] resize-none"
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
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs disabled:opacity-50 ${
                outcome === 'completed'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting
                ? 'Recording...'
                : outcome === 'completed'
                ? 'Mark Completed & Open Scorecard'
                : 'Confirm No-Show'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
