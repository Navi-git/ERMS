import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export default function RejectionReasonModal({ isOpen, onClose, candidateName, onConfirm }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#e0e3e5] relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f4f6]">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Reject Candidate Application</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#71787e] hover:bg-[#f1f4f6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#41474d] leading-relaxed">
          Provide the rejection feedback for <span className="font-bold text-[#191c1e]">{candidateName || 'this candidate'}</span>. This explanation will be recorded and displayed to the candidate on their application status page.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#71787e] block mb-1.5">
              Rejection Reason & Feedback *
            </label>
            <textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. While your background is impressive, we decided to proceed with candidates possessing more direct experience in distributed microservices."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs focus:border-[#ba1a1a] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#71787e] hover:bg-[#f1f4f6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-5 py-2 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <span>Confirm Rejection</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

