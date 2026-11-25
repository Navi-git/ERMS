import React, { useState } from 'react';
import { Flag, X, AlertTriangle, ShieldAlert } from 'lucide-react';

const REPORT_REASONS = [
  'Inappropriate conduct / Harassment',
  'Spam or promotional content',
  'Fraud or suspicious job/payment offer',
  'Misleading representation',
  'Discriminatory remarks',
  'Other violation',
];

export default function ReportChatModal({
  isOpen,
  onClose,
  onSubmit,
  targetUser,
  targetMessage = null,
}) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    try {
      setSubmitting(true);
      await onSubmit({
        reason,
        description,
        messageId: targetMessage?.id || null,
      });
      onClose();
    } catch (err) {
      // Handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-[#e0e3e5] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between bg-[#fbfcfd]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#191c1e]">
                {targetMessage ? 'Report Message' : 'Report Conversation'}
              </h3>
              <p className="text-xs text-[#71787e]">
                Report will be anonymously reviewed by Super Admin moderation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71787e] hover:text-[#191c1e] hover:bg-[#f2f4f6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {targetUser && (
            <div className="p-3 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-sm">
                {targetUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#71787e] uppercase tracking-wider">
                  Reported User
                </p>
                <p className="text-sm font-bold text-[#191c1e] truncate">
                  {targetUser.full_name} ({targetUser.email})
                </p>
              </div>
            </div>
          )}

          {targetMessage && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Selected Message Snippet
              </p>
              <p className="text-xs text-amber-950 italic line-clamp-3 bg-white/70 p-2 rounded border border-amber-100">
                "{targetMessage.content || 'File attachment'}"
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#191c1e] mb-1.5 uppercase tracking-wide">
              Reason for Report *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#c1c7ce] rounded-xl text-sm text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be]"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191c1e] mb-1.5 uppercase tracking-wide">
              Additional Details / Evidence (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any context to help platform administrators take appropriate action..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#c1c7ce] rounded-xl text-sm text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] placeholder:text-[#a0a6ac]"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-[#0058be]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              All reports are kept strictly confidential. The reported user will not know who filed this report.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e0e3e5]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-[#71787e] hover:text-[#191c1e] hover:bg-[#f2f4f6] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
