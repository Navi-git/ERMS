import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  DollarSign,
  Plus,
  Trash2,
  GitCommit,
  Save,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import AddCustomBenefitModal from '../../components/recruiter/AddCustomBenefitModal';
import ConfigureJobStagesModal from '../../components/recruiter/ConfigureJobStagesModal';
import jobApi from '../../api/jobApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';

export default function RecruiterEditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState('draft');

  // Form State
  const [formData, setFormData] = useState({
    job_title: '',
    job_category_id: '',
    department_id: '',
    experience_level_id: '',
    employment_type: 'full_time',
    work_mode_id: '',
    location: '',
    openings: 1,
    job_description: '',
    requirements: '',
    responsibilities: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    accepts_cover_letter: false,
    promote_on_job_boards: false,
    application_deadline: '',
  });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');

  const [selectedBenefits, setSelectedBenefits] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);

  // Master Data Options
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [workModes, setWorkModes] = useState([]);

  // Modals
  const [customBenefitModalOpen, setCustomBenefitModalOpen] = useState(false);
  const [stagesModalOpen, setStagesModalOpen] = useState(false);

  // Submitting
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const [jobRes, catRes, deptRes, expRes, modeRes, skillRes] = await Promise.all([
          jobApi.getRecruiterJob(id),
          masterDataApi.getCategoryItems('job_category'),
          masterDataApi.getCategoryItems('department'),
          masterDataApi.getCategoryItems('experience_level'),
          masterDataApi.getCategoryItems('work_mode'),
          masterDataApi.getCategoryItems('skill'),
        ]);

        const j = jobRes.data;
        setJobStatus(j.job_status);

        setFormData({
          job_title: j.job_title || '',
          job_category_id: j.job_category?.id || '',
          department_id: j.department?.id || '',
          experience_level_id: j.experience_level?.id || '',
          employment_type: j.employment_type || 'full_time',
          work_mode_id: j.work_mode?.id || '',
          location: j.location || '',
          openings: j.openings || 1,
          job_description: j.job_description || '',
          requirements: j.requirements || '',
          responsibilities: j.responsibilities || '',
          salary_min: j.salary_min ? Math.round(j.salary_min) : '',
          salary_max: j.salary_max ? Math.round(j.salary_max) : '',
          salary_currency: j.salary_currency || 'USD',
          accepts_cover_letter: Boolean(j.accepts_cover_letter),
          promote_on_job_boards: Boolean(j.promote_on_job_boards),
          application_deadline: j.application_deadline ? j.application_deadline.slice(0, 10) : '',
        });

        // Set Skills
        setSelectedSkills(
          (j.skills || []).map((sk) => ({
            skill_id: sk.skill_id || sk.id,
            skill_name: sk.skill_name || sk.name,
            is_required: sk.is_required,
            proficiency_level: sk.proficiency_level || 'intermediate',
          }))
        );

        // Set Benefits
        setSelectedBenefits(
          (j.benefits || []).map((b) => ({
            benefit_name: b.benefit_name,
            custom_description: b.custom_description || '',
            is_active: b.is_active,
          }))
        );

        // Set Stages
        setPipelineStages(j.stages || []);

        setCategories(catRes.data?.results || catRes.data || []);
        setDepartments(deptRes.data?.results || deptRes.data || []);
        setExperienceLevels(expRes.data?.results || expRes.data || []);
        setWorkModes(modeRes.data?.results || modeRes.data || []);
        setAvailableSkills(skillRes.data?.results || skillRes.data || []);
      } catch (err) {
        showToast('Unable to load job for editing.', 'error');
        navigate('/recruiter/jobs');
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [id, navigate, showToast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddSkill = (skill) => {
    if (selectedSkills.some((s) => s.skill_id === skill.id)) return;
    setSelectedSkills([
      ...selectedSkills,
      {
        skill_id: skill.id,
        skill_name: skill.value,
        is_required: true,
        proficiency_level: 'intermediate',
      },
    ]);
    setSkillSearch('');
  };

  const handleRemoveSkill = (skillId) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skillId));
  };

  const handleSkillPropChange = (skillId, field, val) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, [field]: val } : s))
    );
  };

  const handleAddCustomBenefit = (newBenefit) => {
    setSelectedBenefits([...selectedBenefits, newBenefit]);
  };

  const handleRemoveBenefit = (idx) => {
    setSelectedBenefits(selectedBenefits.filter((_, i) => i !== idx));
  };

  const preparePayload = () => {
    const payload = { ...formData };
    if (!payload.job_category_id) delete payload.job_category_id;
    if (!payload.department_id) delete payload.department_id;
    if (!payload.experience_level_id) delete payload.experience_level_id;
    if (!payload.work_mode_id) delete payload.work_mode_id;
    if (!payload.salary_min) delete payload.salary_min;
    if (!payload.salary_max) delete payload.salary_max;
    if (!payload.application_deadline) delete payload.application_deadline;
    return payload;
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const payload = preparePayload();
      await jobApi.updateJob(id, payload);
      await jobApi.updateJobSkills(id, selectedSkills);
      await jobApi.updateJobBenefits(id, selectedBenefits);

      showToast('Job updated successfully!', 'success');
      navigate('/recruiter/jobs');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update job.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishFromDraft = async () => {
    setPublishing(true);
    try {
      const payload = preparePayload();
      await jobApi.updateJob(id, payload);
      await jobApi.updateJobSkills(id, selectedSkills);
      await jobApi.updateJobBenefits(id, selectedBenefits);

      await jobApi.publishJob(id);
      showToast('Job successfully published and live!', 'success');
      navigate('/recruiter/jobs');
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot publish job. Please complete required fields.';
      showToast(msg, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const filteredSkills = availableSkills.filter(
    (s) =>
      skillSearch &&
      s.value.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.some((sel) => sel.skill_id === s.id)
  );

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#71787e]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
          <span className="text-sm font-medium">Loading job details...</span>
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header (Figma Page 5) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0e3e5]">
          <div>
            <Link
              to="/recruiter/jobs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71787e] hover:text-[#0058be] mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Job Postings</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight">
              Edit Job Role: <span className="text-[#0058be]">{formData.job_title}</span>
            </h1>
            <p className="text-sm text-[#41474d] mt-0.5">
              Status: <span className="font-bold uppercase text-[#0058be]">{jobStatus}</span> • Modify job details, requirements, and hiring pipeline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving || publishing}
              className="px-5 py-2.5 rounded-xl border border-[#c1c7ce] font-semibold text-xs text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>

            {jobStatus === 'draft' && (
              <button
                type="button"
                onClick={handlePublishFromDraft}
                disabled={saving || publishing}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Publish Job</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Basic Details */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-base font-bold text-[#191c1e] border-b border-[#f1f4f6] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#0058be] text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Basic Details</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Department *
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Job Category *
                  </label>
                  <select
                    name="job_category_id"
                    value={formData.job_category_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Experience Level *
                  </label>
                  <select
                    name="experience_level_id"
                    value={formData.experience_level_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  >
                    <option value="">Select Level</option>
                    {experienceLevels.map((exp) => (
                      <option key={exp.id} value={exp.id}>{exp.value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Employment Type *
                  </label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Work Mode *
                  </label>
                  <select
                    name="work_mode_id"
                    value={formData.work_mode_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  >
                    <option value="">Select Work Mode</option>
                    {workModes.map((wm) => (
                      <option key={wm.id} value={wm.id}>{wm.value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Openings
                  </label>
                  <input
                    type="number"
                    min={1}
                    name="openings"
                    value={formData.openings}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Job Description */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-base font-bold text-[#191c1e] border-b border-[#f1f4f6] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#0058be] text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Job Description & Role Scope</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                  Role Overview * (Markdown Supported)
                </label>
                <textarea
                  rows={4}
                  name="job_description"
                  value={formData.job_description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                  Key Requirements (Markdown Supported)
                </label>
                <textarea
                  rows={3}
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                  Key Responsibilities (Markdown Supported)
                </label>
                <textarea
                  rows={3}
                  name="responsibilities"
                  value={formData.responsibilities}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                />
              </div>
            </div>

            {/* Section 3: Skills */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-base font-bold text-[#191c1e] border-b border-[#f1f4f6] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#0058be] text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Required & Desired Skills</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder="Type to search and add skills..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                />
                {filteredSkills.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#e0e3e5] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 space-y-1">
                    {filteredSkills.slice(0, 8).map((sk) => (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => handleAddSkill(sk)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[#191c1e] hover:bg-[#e8f0fe] hover:text-[#0058be] rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>{sk.value}</span>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSkills.length > 0 && (
                <div className="space-y-2.5">
                  {selectedSkills.map((sk) => (
                    <div
                      key={sk.skill_id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5]"
                    >
                      <span className="font-bold text-xs text-[#191c1e]">
                        {sk.skill_name}
                      </span>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-[#41474d] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sk.is_required}
                            onChange={(e) =>
                              handleSkillPropChange(sk.skill_id, 'is_required', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded text-[#0058be]"
                          />
                          <span>Required</span>
                        </label>

                        <select
                          value={sk.proficiency_level}
                          onChange={(e) =>
                            handleSkillPropChange(sk.skill_id, 'proficiency_level', e.target.value)
                          }
                          className="px-2 py-1 rounded-lg border border-[#c1c7ce] bg-white text-xs text-[#191c1e]"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(sk.skill_id)}
                          className="p-1 text-[#71787e] hover:text-[#ba1a1a]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Compensation & Perks */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e0e3e5] space-y-5 shadow-xs">
              <div className="flex items-center gap-2.5 text-base font-bold text-[#191c1e] border-b border-[#f1f4f6] pb-3">
                <span className="w-6 h-6 rounded-full bg-[#0058be] text-white text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <span>Compensation & Benefits</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Salary Min ($)
                  </label>
                  <input
                    type="number"
                    name="salary_min"
                    value={formData.salary_min}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Salary Max ($)
                  </label>
                  <input
                    type="number"
                    name="salary_max"
                    value={formData.salary_max}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Currency
                  </label>
                  <select
                    name="salary_currency"
                    value={formData.salary_currency}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold uppercase text-[#71787e] tracking-wider">
                    Perks & Benefits ({selectedBenefits.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomBenefitModalOpen(true)}
                    className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Benefit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedBenefits.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs text-[#191c1e]">{b.benefit_name}</div>
                        {b.custom_description && (
                          <div className="text-[10px] text-[#71787e]">{b.custom_description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(idx)}
                        className="p-1 text-[#71787e] hover:text-[#ba1a1a]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                Publishing Settings
              </h3>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#191c1e]">Promote on Job Boards</div>
                    <div className="text-[11px] text-[#71787e]">Promote applications to priority review</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="promote_on_job_boards"
                      checked={formData.promote_on_job_boards}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#c1c7ce] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0058be]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#191c1e]">Accept Cover Letters</div>
                    <div className="text-[11px] text-[#71787e]">Require cover letters from applicants</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="accepts_cover_letter"
                      checked={formData.accepts_cover_letter}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#c1c7ce] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0058be]"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#71787e] mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    name="application_deadline"
                    value={formData.application_deadline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStagesModalOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-[#0058be] text-[#0058be] hover:bg-[#e8f0fe] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <GitCommit className="w-4 h-4" />
                  <span>+ Configure Job Stages ({pipelineStages.length})</span>
                </button>
              </div>
            </div>

            <div className="bg-[#e8f0fe] rounded-3xl p-6 border border-[#c3d9fe] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0058be]">
                <Sparkles className="w-4 h-4" />
                <span>Pro Tip</span>
              </div>
              <p className="text-xs text-[#41474d] leading-relaxed">
                Keeping requirements tight and well-defined prevents applicant fatigue and produces higher quality candidate match scores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddCustomBenefitModal
        isOpen={customBenefitModalOpen}
        onClose={() => setCustomBenefitModalOpen(false)}
        onAdd={handleAddCustomBenefit}
      />

      <ConfigureJobStagesModal
        isOpen={stagesModalOpen}
        onClose={() => setStagesModalOpen(false)}
        stages={pipelineStages}
        onSaveStages={async (updated) => {
          setPipelineStages(updated);
          // If already existing on server, sync reorder or changes
          try {
            await jobApi.reorderJobStages(id, { stage_ids: updated.map((s) => s.id) });
          } catch (err) {
            // Ignored if temporary client stages
          }
        }}
      />
    </RecruiterLayout>
  );
}

