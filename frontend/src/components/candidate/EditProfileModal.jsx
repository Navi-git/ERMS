import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

export default function EditProfileModal({ profile, onClose, onSave }) {
  const [formData, setFormData] = useState({
    headline: profile?.headline || '',
    summary: profile?.summary || '',
    current_location: profile?.current_location || '',
    seeking_status: profile?.seeking_status || 'actively_seeking',
    expected_salary_min: profile?.expected_salary_min || '',
    expected_salary_max: profile?.expected_salary_max || '',
    currency: profile?.currency || 'USD',
    willing_to_relocate: profile?.willing_to_relocate || false,
    work_authorization_status: profile?.work_authorization_status || '',
    security_clearance: profile?.security_clearance || '',
    linkedin_url: profile?.linkedin_url || '',
    github_url: profile?.github_url || '',
    portfolio_url: profile?.portfolio_url || '',
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
      expected_salary_min: formData.expected_salary_min ? parseInt(formData.expected_salary_min, 10) : null,
      expected_salary_max: formData.expected_salary_max ? parseInt(formData.expected_salary_max, 10) : null,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update profile. Please check the fields.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-[#191c1e]">Edit Candidate Profile</h3>
            <p className="text-xs text-[#71787e]">Update your professional headline, preferences, and details.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71787e] hover:text-[#191c1e] hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-650 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Headline */}
          <div>
            <label className="block font-semibold text-[#191c1e] mb-1">
              Professional Headline <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              placeholder="e.g. Senior Full-Stack Engineer | Python, React, Cloud Architecture"
              className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              required
            />
          </div>

          {/* Seeking Status & Current Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">
                Job Seeking Status <span className="text-red-500">*</span>
              </label>
              <select
                name="seeking_status"
                value={formData.seeking_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e] bg-white"
              >
                <option value="actively_seeking">Actively Seeking (Visible to Recruiters)</option>
                <option value="open_to_offers">Open to Offers (Visible to Recruiters)</option>
                <option value="not_seeking">Not Seeking (Hidden from Recruiter Search)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Current Location</label>
              <input
                type="text"
                name="current_location"
                value={formData.current_location}
                onChange={handleChange}
                placeholder="e.g. San Francisco, CA or Remote"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
          </div>

          {/* About Me / Summary */}
          <div>
            <label className="block font-semibold text-[#191c1e] mb-1">
              Professional Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              name="summary"
              rows={4}
              value={formData.summary}
              onChange={handleChange}
              placeholder="Highlight your background, core technical strengths, and what you are looking for next..."
              className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              required
            />
          </div>

          {/* Expected Salary & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Min Expected Salary</label>
              <input
                type="number"
                name="expected_salary_min"
                value={formData.expected_salary_min}
                onChange={handleChange}
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Max Expected Salary</label>
              <input
                type="number"
                name="expected_salary_max"
                value={formData.expected_salary_max}
                onChange={handleChange}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e] bg-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          {/* Relocation & Authorization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Work Authorization</label>
              <input
                type="text"
                name="work_authorization_status"
                value={formData.work_authorization_status}
                onChange={handleChange}
                placeholder="e.g. US Citizen, Green Card, H1B"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Security Clearance</label>
              <input
                type="text"
                name="security_clearance"
                value={formData.security_clearance}
                onChange={handleChange}
                placeholder="e.g. None, Secret, Top Secret"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="relocateCheck"
              name="willing_to_relocate"
              checked={formData.willing_to_relocate}
              onChange={handleChange}
              className="w-4 h-4 rounded text-[#0058be] focus:ring-[#0058be]"
            />
            <label htmlFor="relocateCheck" className="text-xs font-medium text-[#191c1e]">
              Willing to relocate for the right opportunity
            </label>
          </div>

          {/* Social Links */}
          <div className="space-y-3 pt-2 border-t border-[#e0e3e5]">
            <h4 className="font-bold text-[#191c1e]">Social & Portfolio Links</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#71787e] mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#71787e] mb-1">GitHub URL</label>
                <input
                  type="url"
                  name="github_url"
                  value={formData.github_url}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                  className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#71787e] mb-1">Portfolio URL</label>
                <input
                  type="url"
                  name="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={handleChange}
                  placeholder="https://yourportfolio.dev"
                  className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-lg bg-[#0058be] hover:bg-[#004ca5] text-white font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

