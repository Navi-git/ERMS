import React from 'react';
import { X, AlertTriangle, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export default function DiscardDraftConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName = 'Candidate',
  applicationId,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Discard Changes & Exit?</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Are you sure you want to discard unsaved changes and return to the applicant dossier?
            </p>
          </div>
        </div>

        {/* Target Context Capsule */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">Candidate:</span>
            <span className="font-bold text-slate-900">{candidateName}</span>
          </div>
          {applicationId && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Application ID:</span>
              <span className="font-mono text-slate-700">#APP-{applicationId}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">Unsaved Status:</span>
            <span className="text-rose-600 font-bold">Uncommitted formulation changes</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed">
          <span className="font-bold">Tip:</span> If you want to keep your progress and finish later, click <span className="font-semibold">Keep Editing</span> and then <span className="font-semibold">Save as Draft</span> instead.
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Discard Changes & Return</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Keep Editing Offer
          </button>
        </div>
      </div>
    </div>
  );
}
