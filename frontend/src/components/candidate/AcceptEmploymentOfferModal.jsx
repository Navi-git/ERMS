import React from 'react';
import { CheckCircle2, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AcceptEmploymentOfferModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  offer,
}) {
  if (!isOpen || !offer) return null;

  const jobTitle = offer.job_title || 'Position';
  const companyName = offer.company_name || 'the company';
  const salaryFormatted = `$${(offer.salary || 0).toLocaleString()} ${offer.currency || 'USD'}`;
  const startDateStr = offer.start_date
    ? new Date(offer.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'To be confirmed';

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

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Accept Employment Offer</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              You are accepting the position of <span className="font-semibold text-slate-800">{jobTitle}</span> at{' '}
              <span className="font-semibold text-slate-800">{companyName}</span>.
            </p>
          </div>
        </div>

        {/* Offer Summary Capsule */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Annual Base Salary:</span>
            <span className="font-bold text-slate-900">{salaryFormatted}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Proposed Start Date:</span>
            <span className="font-bold text-slate-900">{startDateStr}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Employment Classification:</span>
            <span className="font-semibold text-slate-800 capitalize">
              {offer.employment_type?.replace('_', ' ') || 'Full-time'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-800">
          <ShieldCheck className="w-4 h-4 text-[#0058be] shrink-0" />
          <span>Acceptance will be officially recorded and communicated to the hiring team.</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Confirming Acceptance...' : 'Confirm & Accept Offer'}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel / Review More
          </button>
        </div>
      </div>
    </div>
  );
}
