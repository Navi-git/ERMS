import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function AddEditExperienceModal({ initialData, onClose, onSave }) {
  const [formData, setFormData] = useState({
    job_title: initialData?.job_title || '',
    company_name: initialData?.company_name || '',
    employment_type: initialData?.employment_type || 'full_time',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    is_current: initialData?.is_current || false,
    description: initialData?.description || '',
    location: initialData?.location || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...formData,
      end_date: formData.is_current ? null : formData.end_date,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      const fieldErrors = err?.response?.data;
      if (typeof fieldErrors === 'object') {
        const msg = Object.entries(fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        setError(msg);
      } else {
        setError(err?.response?.data?.detail || 'Failed to save experience.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-[#191c1e]">
              {initialData ? 'Edit Work Experience' : 'Add Work Experience'}
            </h3>
            <p className="text-xs text-[#71787e]">Detail your employment history and key responsibilities.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71787e] hover:text-[#191c1e] hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-650 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#191c1e] mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g. Stripe, Google, Acme Corp"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Employment Type</label>
              <select
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e] bg-white"
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#191c1e] mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. New York, NY or Remote"
              className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                disabled={formData.is_current}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e] disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrentExp"
              name="is_current"
              checked={formData.is_current}
              onChange={handleChange}
              className="w-4 h-4 rounded text-[#0058be] focus:ring-[#0058be]"
            />
            <label htmlFor="isCurrentExp" className="text-xs font-medium text-[#191c1e]">
              I currently work here
            </label>
          </div>

          <div>
            <label className="block font-semibold text-[#191c1e] mb-1">Responsibilities & Impact</label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your achievements, technical stack used, and quantifiable results..."
              className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
            />
          </div>

          <div className="pt-4 border-t border-[#e0e3e5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-[#c3c7cb] text-[#41474d] hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#0058be] hover:bg-[#004ca5] text-white font-medium shadow-sm transition-colors"
            >
              {saving ? 'Saving...' : initialData ? 'Update Experience' : 'Add Experience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
