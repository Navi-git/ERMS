import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';

export default function AdminFlagJobModal({ isOpen, onClose, job, onSuccess }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('Administrative policy check');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please select or enter a reason.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await jobApi.flagAdminJob(job.id, {
        reason: reason.trim(),
        description: description.trim(),
      });
      showToast('Job listing flagged for administrative moderation review.', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to flag job.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5e8ec] relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f5]">
          <div className="flex items-center gap-2 text-[#ba1a1a] font-bold text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Flag Job for Review</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description note */}
        <div>
          <h4 className="text-sm font-bold text-[#191c1e]">{job.job_title}</h4>
          <p className="text-xs text-[#535862] mt-0.5">
            {job.company_name} • Flagging registers a moderation incident ticket for investigation without altering the current live status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#717680] block mb-1.5">
              Flag Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-xs font-semibold text-[#191c1e] focus:outline-hidden focus:border-[#ba1a1a]"
              required
            >
              <option value="Administrative policy check">Administrative policy check</option>
              <option value="Suspected scam or fraudulent posting">Suspected scam or fraudulent posting</option>
              <option value="Misleading compensation or salary terms">Misleading compensation or salary terms</option>
              <option value="Discriminatory or inappropriate content">Discriminatory or inappropriate content</option>
              <option value="Asking for upfront fees or payment">Asking for upfront fees or payment</option>
              <option value="Ghost listing or unresponsive company">Ghost listing or unresponsive company</option>
              <option value="Other TOS violation">Other TOS violation</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#717680] block mb-1.5">
              Investigation Notes / Details (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add specific context, offending phrases, or evidence for the moderation log..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#ba1a1a]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#f0f2f5]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-[#d5d7da] text-xs font-semibold text-[#414651] hover:bg-[#f8f9fa] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Flag...</span>
                </>
              ) : (
                <span>Confirm Flag</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

