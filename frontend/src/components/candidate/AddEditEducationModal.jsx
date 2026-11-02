import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function AddEditEducationModal({ initialData, onClose, onSave }) {
  const [formData, setFormData] = useState({
    institution: initialData?.institution || '',
    degree: initialData?.degree || '',
    field_of_study: initialData?.field_of_study || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    is_currently_studying: initialData?.is_currently_studying || false,
    gpa: initialData?.gpa || '',
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
      end_date: formData.is_currently_studying ? null : formData.end_date || null,
      start_date: formData.start_date || null,
      gpa: formData.gpa ? parseFloat(formData.gpa) : null,
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
        setError(err?.response?.data?.detail || 'Failed to save education record.');
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
              {initialData ? 'Edit Education' : 'Add Education'}
            </h3>
            <p className="text-xs text-[#71787e]">Add your degrees, certifications, or academic programs.</p>
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
              Institution Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              placeholder="e.g. Stanford University or MIT"
              className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Degree</label>
              <input
                type="text"
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                placeholder="e.g. Bachelor of Science"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Field of Study</label>
              <input
                type="text"
                name="field_of_study"
                value={formData.field_of_study}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                disabled={formData.is_currently_studying}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e] disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">GPA (optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                name="gpa"
                value={formData.gpa}
                onChange={handleChange}
                placeholder="e.g. 3.85"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isStudyingCheck"
              name="is_currently_studying"
              checked={formData.is_currently_studying}
              onChange={handleChange}
              className="w-4 h-4 rounded text-[#0058be] focus:ring-[#0058be]"
            />
            <label htmlFor="isStudyingCheck" className="text-xs font-medium text-[#191c1e]">
              I am currently enrolled / studying here
            </label>
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
              {saving ? 'Saving...' : initialData ? 'Update Education' : 'Add Education'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
