import React, { useState } from 'react';
import { X, PauseCircle, AlertTriangle, Loader2 } from 'lucide-react';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';

export default function AdminHoldJobModal({ isOpen, onClose, job, onSuccess }) {
  const { showToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState('Administrative policy review in progress');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = customReason.trim() || selectedPreset;
    if (!finalReason) {
      showToast('Please specify a reason for placing this job on hold.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await jobApi.updateAdminJobStatus(job.id, {
        status: 'on_hold',
        reason: finalReason,
      });
      showToast('Job listing has been placed on hold.', 'success');
      onSuccess?.(finalReason);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to place job on hold.';
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
          <div className="flex items-center gap-2 text-[#b06000] font-bold text-sm">
            <PauseCircle className="w-4 h-4 shrink-0" />
            <span>Place Listing on Hold</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning callout */}
        <div className="p-3 rounded-2xl bg-[#fff8e1] border border-[#ffe082] text-xs text-[#7c4a00] space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Effects of Placing on Hold:</span>
          </div>
          <p className="leading-relaxed">
            This job will be immediately delisted from the public job board, candidate searches, and direct access. Candidates will not be able to submit new applications until you reactivate it.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-[#191c1e]">{job.job_title}</h4>
          <p className="text-xs text-[#535862] mt-0.5">{job.company_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#717680] block mb-1.5">
              Reason Category
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                if (e.target.value !== 'Other') {
                  setCustomReason('');
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-xs font-semibold text-[#191c1e] focus:outline-hidden focus:border-[#b06000]"
            >
              <option value="Administrative policy review in progress">Administrative policy review in progress</option>
              <option value="Employer account verification required">Employer account verification required</option>
              <option value="Suspicious job details or misleading information">Suspicious job details or misleading information</option>
              <option value="High volume of community reports">High volume of community reports</option>
              <option value="Temporary recruitment pause requested">Temporary recruitment pause requested</option>
              <option value="Other">Other (specify below)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#717680] block mb-1.5">
              Reason Explanation *
            </label>
            <textarea
              required
              rows={3}
              value={customReason || (selectedPreset !== 'Other' ? selectedPreset : '')}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="State the reason this job listing is being placed on hold..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] text-xs text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#b06000]"
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
              className="px-5 py-2 rounded-xl bg-[#b06000] hover:bg-[#8f4e00] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Placing on Hold...</span>
                </>
              ) : (
                <span>Confirm Hold</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

