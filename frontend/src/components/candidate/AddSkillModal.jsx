import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, AlertCircle, PlusCircle } from 'lucide-react';
import { masterDataApi } from '../../api/masterDataApi';

export default function AddSkillModal({ existingSkills, onClose, onSave }) {
  const [catalogSkills, setCatalogSkills] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOtherCustom, setIsOtherCustom] = useState(false);

  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState('intermediate');
  const [yearsOfExperience, setYearsOfExperience] = useState('1.0');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await masterDataApi.getCategoryItems('skill');
        setCatalogSkills(res.data || []);
      } catch (err) {
        console.warn('Could not load skills catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  const existingSkillIds = new Set(
    existingSkills?.filter((s) => s.skill).map((s) => s.skill) || []
  );

  const filteredSkills = catalogSkills.filter((s) => {
    const matchesSearch = s.value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && !existingSkillIds.has(s.id);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!isOtherCustom && !selectedSkillId) {
      setError('Please select a skill from the list or choose "Other" to enter a custom skill.');
      setSaving(false);
      return;
    }

    if (isOtherCustom && !customSkillName.trim()) {
      setError('Please provide a name for the custom skill.');
      setSaving(false);
      return;
    }

    const payload = {
      skill_id: isOtherCustom ? null : parseInt(selectedSkillId, 10),
      custom_skill_name: isOtherCustom ? customSkillName.trim() : null,
      proficiency_level: proficiencyLevel,
      years_of_experience: yearsOfExperience ? parseFloat(yearsOfExperience) : null,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to add skill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#e0e3e5] flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-[#191c1e]">Add Skill & Expertise</h3>
            <p className="text-xs text-[#71787e]">Select a verified skill or submit a new custom skill.</p>
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

          {/* Toggle between catalog and custom other */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setIsOtherCustom(false)}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
                !isOtherCustom
                  ? 'bg-white text-[#0058be] shadow-xs'
                  : 'text-[#41474d] hover:text-[#191c1e]'
              }`}
            >
              Master Catalog
            </button>
            <button
              type="button"
              onClick={() => setIsOtherCustom(true)}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
                isOtherCustom
                  ? 'bg-white text-[#0058be] shadow-xs'
                  : 'text-[#41474d] hover:text-[#191c1e]'
              }`}
            >
              Other / Custom Skill
            </button>
          </div>

          {!isOtherCustom ? (
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">
                Select Skill from Master Data <span className="text-red-500">*</span>
              </label>

              {/* Search filter */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter skills (e.g. React, Python, Docker)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-[#c3c7cb] rounded-lg text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                />
              </div>

              {/* Skills list selector */}
              <div className="border border-[#c3c7cb] rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100 bg-white">
                {loadingCatalog ? (
                  <p className="p-4 text-center text-slate-400">Loading catalog skills...</p>
                ) : filteredSkills.length === 0 ? (
                  <div className="p-4 text-center space-y-1">
                    <p className="text-slate-500 font-medium">No matching skills found in catalog.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtherCustom(true);
                        setCustomSkillName(searchQuery);
                      }}
                      className="text-[#0058be] hover:underline font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add "{searchQuery || 'custom'}" as custom skill
                    </button>
                  </div>
                ) : (
                  filteredSkills.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedSkillId === String(s.id) ? 'bg-blue-50/70 font-semibold text-[#0058be]' : 'text-[#191c1e]'
                      }`}
                    >
                      <span>{s.value}</span>
                      <input
                        type="radio"
                        name="catalogSkill"
                        value={s.id}
                        checked={selectedSkillId === String(s.id)}
                        onChange={(e) => setSelectedSkillId(e.target.value)}
                        className="text-[#0058be] focus:ring-[#0058be]"
                      />
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">
                Custom Skill Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customSkillName}
                onChange={(e) => setCustomSkillName(e.target.value)}
                placeholder="e.g. Next.js, FastAPI, Apache Kafka, Solidity"
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
                required
              />
              <p className="text-[11px] text-[#71787e] mt-1">
                Custom skills will be added to your profile immediately and flagged for admin taxonomy review.
              </p>
            </div>
          )}

          {/* Proficiency Level & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Proficiency Level</label>
              <select
                value={proficiencyLevel}
                onChange={(e) => setProficiencyLevel(e.target.value)}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e] bg-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#191c1e] mb-1">Years of Experience</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="w-full px-3 py-2 border border-[#c3c7cb] rounded-lg focus:outline-none focus:border-[#0058be] text-xs text-[#191c1e]"
              />
            </div>
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
              {saving ? 'Adding...' : 'Add Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
