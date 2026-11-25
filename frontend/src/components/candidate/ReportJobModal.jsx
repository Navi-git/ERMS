import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';

export default function ReportJobModal({ isOpen, onClose, jobId, jobTitle }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('Scam or Fraudulent Listing');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      showToast('Please select a reason for reporting.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await jobApi.reportJob(jobId, { reason, description });
      showToast('Thank you. The job posting has been flagged for administrative review.', 'success');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report. Please try again.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e3e5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e5]">
          <div className="flex items-center gap-2.5 text-[#ba1a1a]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-lg text-[#191c1e]">Report Job Posting</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-[#41474d]">
            Help keep TalentBridge trustworthy. Why are you reporting <span className="font-semibold text-[#191c1e]">"{jobTitle}"</span>?
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
              Reason for Report *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
              required
            >
              <option value="Scam or Fraudulent Listing">Scam or Fraudulent Listing</option>
              <option value="Inaccurate or Misleading Compensation">Inaccurate or Misleading Compensation</option>
              <option value="Discriminatory or Inappropriate Content">Discriminatory or Inappropriate Content</option>
              <option value="Closed or Ghost Job Posting">Closed or Ghost Job Posting</option>
              <option value="Asking for Upfront Payment/Fees">Asking for Upfront Payment/Fees</option>
              <option value="Other Policy Violation">Other Policy Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context or proof to assist our moderation team..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e0e3e5]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#41474d] hover:bg-[#f1f4f6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#ba1a1a] hover:bg-[#93000a] transition-colors shadow-xs"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

