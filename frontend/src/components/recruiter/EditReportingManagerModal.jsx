import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Check, Sparkles } from 'lucide-react';

export default function EditReportingManagerModal({
  isOpen,
  onClose,
  managerName = '',
  managerTitle = '',
  onSave,
}) {
  const [name, setName] = useState(managerName);
  const [title, setTitle] = useState(managerTitle);

  useEffect(() => {
    if (isOpen) {
      setName(managerName || '');
      setTitle(managerTitle || '');
    }
  }, [isOpen, managerName, managerTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), title: title.trim() });
    onClose();
  };

  const getInitials = (str) => {
    if (!str) return 'MG';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0058be] flex items-center justify-center border border-blue-100 shadow-xs shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Assign Reporting Manager</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify the direct supervisor and title for this position.
            </p>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0058be] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
            {getInitials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 truncate">
                {name || 'Manager Name'}
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-[#0058be] border border-blue-200 shrink-0">
                Direct Supervisor
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {title || 'Professional Title / Department'}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reporting Manager Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marcus Kelly"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/10 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Professional Title & Function
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Director • Product Design & Systems"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/10 outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Appears on the offer letter signatory block and candidate roadmap.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#004ca5] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Manager</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
