import React, { useState } from 'react';
import { X, Sparkles, Bookmark, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import jobApi from '../../api/jobApi';
import { useToast } from '../../context/ToastContext';

export default function ApplyJobInfoModal({ isOpen, onClose, job, isSaved, onSaveToggle }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  if (!isOpen || !job) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await jobApi.toggleSavedJob(job.id);
      showToast(res.data?.message || 'Bookmark updated', 'success');
      if (onSaveToggle) onSaveToggle(res.data?.saved);
    } catch (err) {
      const msg = err.response?.data?.message || 'Please log in as a candidate to save jobs.';
      showToast(msg, 'info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#e0e3e5] relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#0058be] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Sparkles className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-[#191c1e] tracking-tight mb-2">
          Applications Portal Coming Up!
        </h3>

        <p className="text-sm text-[#41474d] leading-relaxed mb-6">
          Direct 1-click application submission with resume selection, ATS profile scoring, and screening questions will open in the next module: <span className="font-semibold text-[#191c1e]">Applications & Screening</span>.
        </p>

        <div className="p-4 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] text-left mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71787e]">
            <span>Target Role</span>
          </div>
          <div className="font-bold text-base text-[#191c1e] leading-snug">
            {job.job_title}
          </div>
          <div className="text-sm text-[#5a6066]">
            {job.company?.name} • {job.location || 'Remote'}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all shadow-xs cursor-pointer ${
              isSaved
                ? 'bg-[#e8f0fe] text-[#0058be] border border-[#c3d9fe]'
                : 'bg-[#0058be] text-white hover:bg-[#004ca5]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Job Bookmarked in Saved Jobs' : 'Save Job for Easy Access'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-[#71787e] hover:text-[#191c1e] transition-colors cursor-pointer"
          >
            Got it, continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}

