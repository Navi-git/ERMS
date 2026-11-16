import React from 'react';
import { AlertTriangle, Archive, Trash2, Info, Loader2 } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning', // 'warning' | 'danger' | 'archive' | 'primary'
  icon: CustomIcon,
  loading = false,
}) {
  if (!isOpen) return null;

  // Variant configs
  const variantStyles = {
    warning: {
      iconBg: 'bg-amber-50 text-amber-600',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
      defaultIcon: AlertTriangle,
    },
    archive: {
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
      defaultIcon: Archive,
    },
    danger: {
      iconBg: 'bg-rose-50 text-[#ba1a1a]',
      confirmBtn: 'bg-[#ba1a1a] hover:bg-[#93000a] text-white shadow-xs',
      defaultIcon: Trash2,
    },
    primary: {
      iconBg: 'bg-blue-50 text-[#0058be]',
      confirmBtn: 'bg-[#0058be] hover:bg-[#004ca8] text-white shadow-xs',
      defaultIcon: Info,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.warning;
  const IconComponent = CustomIcon || currentVariant.defaultIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-[#e0e3e5] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Icon Badge */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${currentVariant.iconBg}`}>
          <IconComponent className="w-6 h-6" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-base text-[#191c1e]">{title}</h3>
          <div className="text-xs text-[#5f6368] leading-relaxed">
            {message}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#c1c7ce] text-xs font-bold text-[#41474d] hover:bg-[#f1f4f6] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${currentVariant.confirmBtn}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
