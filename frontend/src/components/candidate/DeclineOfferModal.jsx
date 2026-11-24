import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { offerApi } from '../../api/offerApi';

export default function DeclineOfferModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  companyName,
}) {
  const [reasons, setReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadReasons();
    }
  }, [isOpen]);

  const loadReasons = async () => {
    try {
      const res = await offerApi.getDeclineReasons();
      setReasons(res.data?.reasons || []);
    } catch {
      setReasons([
        { key: 'accepted_other_offer', label: 'Accepted another offer' },
        { key: 'compensation_too_low', label: 'Compensation below expectation' },
        { key: 'role_mismatch', label: 'Role or responsibilities mismatch' },
        { key: 'location_commute', label: 'Location or commute issues' },
        { key: 'personal_reasons', label: 'Personal or family circumstances' },
        { key: 'other', label: 'Other reason' },
      ]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      decline_reason: selectedReason || 'Other reason',
      candidate_feedback: feedback,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Decline Offer</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Please let {companyName || 'the hiring team'} know why you are declining this offer to help improve their hiring process:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Declining (Optional)
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-rose-500 outline-none"
            >
              <option value="">Select reason (Optional)</option>
              {reasons.map((r) => (
                <option key={r.key} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Additional Feedback for the Hiring Team (Optional)
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share additional context or message for the hiring manager..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:border-rose-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Declining this offer will formally conclude this recruitment process.</span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Submitting Response...' : 'Confirm Decline'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
