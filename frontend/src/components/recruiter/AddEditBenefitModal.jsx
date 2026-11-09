import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

export default function AddEditBenefitModal({ isOpen, onClose, onSave, benefit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (benefit) {
      setName(benefit.name || '');
      setDescription(benefit.custom_description || '');
      setDisplayOrder(benefit.display_order || 0);
      setIsActive(benefit.is_active ?? true);
    } else {
      setName('');
      setDescription('');
      setDisplayOrder(0);
      setIsActive(true);
    }
    setError('');
  }, [benefit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) {
      setError('Please provide a benefit title.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave({
        name: name.trim(),
        custom_description: description.trim(),
        display_order: parseInt(displayOrder, 10) || 0,
        is_active: isActive,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save benefit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#e0e3e5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#0058be] flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#191c1e]">
                {benefit ? 'Edit Company Benefit' : 'Add Culture & Benefit'}
              </h2>
              <p className="text-xs text-[#71787e]">
                Highlight what makes your company a great place to work.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#71787e] hover:text-[#191c1e] hover:bg-[#f1f4f6] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Benefit Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191c1e]">
              Benefit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Remote-First Culture, Comprehensive Health, Unlimited PTO"
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191c1e]">
              Custom Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Work from anywhere in the world, with flexible hours tailored to your lifestyle."
              className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] placeholder-[#71787e] focus:outline-none focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 leading-relaxed"
            />
          </div>

          {/* Display Order & Active Toggle */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#191c1e]">
                Display Order
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                min={0}
                max={99}
                className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#191c1e]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#c3c7cb] text-[#0058be] focus:ring-[#0058be] w-4 h-4"
                />
                <span>Active on Public Profile</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e0e3e5] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-[#41474d] hover:bg-[#f1f4f6] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : benefit ? 'Update Benefit' : 'Add Benefit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

