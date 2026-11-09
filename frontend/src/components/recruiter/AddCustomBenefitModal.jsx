import React, { useState } from 'react';
import { X, Gift } from 'lucide-react';

export default function AddCustomBenefitModal({ isOpen, onClose, onAdd }) {
  const [benefitName, setBenefitName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!benefitName.trim()) return;

    onAdd({
      benefit_name: benefitName.trim(),
      custom_description: description.trim(),
      is_active: isActive,
    });

    setBenefitName('');
    setDescription('');
    setIsActive(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#e0e3e5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e5]">
          <div className="flex items-center gap-2.5 text-[#0058be]">
            <Gift className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-lg text-[#191c1e]">Add Custom Benefit</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-[#71787e]">
            This benefit will be shown on the published job posting for candidates.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
              Benefit Name *
            </label>
            <input
              type="text"
              value={benefitName}
              onChange={(e) => setBenefitName(e.target.value)}
              placeholder="e.g. Annual Learning Stipend"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the benefit (e.g. $1,500/year to spend on courses, conferences, or books)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5]">
            <div>
              <div className="text-xs font-semibold text-[#191c1e]">Active Status</div>
              <div className="text-[11px] text-[#71787e]">Inactive benefits won't be shown on listing</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#c1c7ce] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0058be]"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e0e3e5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#41474d] hover:bg-[#f1f4f6] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer"
            >
              Add Benefit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

