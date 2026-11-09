import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  DollarSign,
  Plus,
  Trash2,
  GitCommit,
  Check,
  Save,
  Send,
  Loader2,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import AddCustomBenefitModal from '../../components/recruiter/AddCustomBenefitModal';
import ConfigureJobStagesModal from '../../components/recruiter/ConfigureJobStagesModal';
import jobApi from '../../api/jobApi';
import masterDataApi from '../../api/masterDataApi';
import companyApi from '../../api/companyApi';
import { useToast } from '../../context/ToastContext';

export default function RecruiterCreateJobPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Company verification state
  const [company, setCompany] = useState(null);

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

  // Skills state: array of { skill_id, skill_name, is_required, proficiency_level }
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');

  // Benefits state: array of { benefit_name, custom_description, is_active }
  const [selectedBenefits, setSelectedBenefits] = useState([
    { benefit_name: 'Comprehensive Health Insurance', custom_description: '', is_active: true },
    { benefit_name: '401(k) Matching (up to 5%)', custom_description: '', is_active: true },
    { benefit_name: 'Flexible PTO Policy', custom_description: '', is_active: true },
    { benefit_name: 'Home Office & Tech Stipend', custom_description: '', is_active: true },
  ]);

  // Stages state: array of { id, name, stage_order, stage_type, description, is_required, is_active }
  const [pipelineStages, setPipelineStages] = useState([
    { id: 1, name: 'Applied', stage_order: 1, stage_type: 'applied', is_required: true, is_active: true },
    { id: 2, name: 'Screening', stage_order: 2, stage_type: 'screening', is_required: true, is_active: true },
    { id: 3, name: 'Technical Interview', stage_order: 3, stage_type: 'interview', is_required: true, is_active: true },
    { id: 4, name: 'Offer', stage_order: 4, stage_type: 'offer', is_required: true, is_active: true },
  ]);

  // Master Data Options
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [workModes, setWorkModes] = useState([]);

  // Modals
  const [customBenefitModalOpen, setCustomBenefitModalOpen] = useState(false);
  const [stagesModalOpen, setStagesModalOpen] = useState(false);

  // Submitting
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function initData() {
      try {
        const [compRes, catRes, deptRes, expRes, modeRes, skillRes] = await Promise.all([
          companyApi.getRecruiterCompany(),
          masterDataApi.getCategoryItems('job_category'),
          masterDataApi.getCategoryItems('department'),
          masterDataApi.getCategoryItems('experience_level'),
          masterDataApi.getCategoryItems('work_mode'),
          masterDataApi.getCategoryItems('skill'),
        ]);

        setCompany(compRes.data);
        setCategories(catRes.data?.results || catRes.data || []);
        setDepartments(deptRes.data?.results || deptRes.data || []);
        setExperienceLevels(expRes.data?.results || expRes.data || []);
        setWorkModes(modeRes.data?.results || modeRes.data || []);
        setAvailableSkills(skillRes.data?.results || skillRes.data || []);
      } catch (err) {
        // Handled silently
      }
    }
    initData();
  }, []);

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

  // Prepare Payload
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

  // 1. Save Draft
  const handleSaveDraft = async () => {
    if (!formData.job_title.trim()) {
      showToast('Please enter at least a Job Title to save a draft.', 'error');
      return;
    }

    setSavingDraft(true);
    try {
      const payload = preparePayload();
      const res = await jobApi.createJob(payload);
      const createdJobId = res.data.id;

      // Sync skills & benefits
      if (selectedSkills.length > 0) {
        await jobApi.updateJobSkills(createdJobId, selectedSkills);
      }
      if (selectedBenefits.length > 0) {
        await jobApi.updateJobBenefits(createdJobId, selectedBenefits);
      }

      showToast('Job draft saved successfully!', 'success');
      navigate('/recruiter/jobs?status=draft');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save job draft.';
      showToast(msg, 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  // 2. Publish Job
  const handlePublishJob = async () => {
    if (company?.verification_status !== 'APPROVED') {
      showToast('Your company profile must be verified before publishing jobs.', 'error');
      return;
    }

    setPublishing(true);
    try {
      const payload = preparePayload();
      const res = await jobApi.createJob(payload);
      const createdJobId = res.data.id;

      // Sync skills & benefits
      if (selectedSkills.length > 0) {
        await jobApi.updateJobSkills(createdJobId, selectedSkills);
      }
      if (selectedBenefits.length > 0) {
        await jobApi.updateJobBenefits(createdJobId, selectedBenefits);
      }

      // Publish call
      await jobApi.publishJob(createdJobId);

      showToast('Congratulations! Your job posting is now published and active.', 'success');
      navigate('/recruiter/jobs');
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not publish job. Please complete all required fields.';
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

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Top Header & Actions (Figma Page 4) */}
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
              Post a New Role
            </h1>
            <p className="text-sm text-[#41474d] mt-0.5">
              Create a compelling job listing to attract top talent. Provide clear details about expectations and perks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing}
              className="px-5 py-2.5 rounded-xl border border-[#c1c7ce] font-semibold text-xs text-[#41474d] hover:bg-[#f1f4f6] transition-colors flex items-center gap-2 cursor-pointer"
            >
              {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handlePublishJob}
              disabled={savingDraft || publishing}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Publish Job</span>
            </button>
          </div>
        </div>

        {/* 2-Column Form Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main 2 Cols: Form Sections */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Basic Details (Figma Page 4) */}
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
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20"
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
                    placeholder="e.g. San Francisco, CA or Remote"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-[#71787e] mb-1.5 tracking-wider">
                    Openings Count
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

            {/* Section 2: Job Description (Markdown Supported) (Figma Page 4 & 5) */}
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
                  placeholder="Describe the day-to-day responsibilities, mission, and impact of this role..."
                  className="w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be] font-sans"
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
                  placeholder="List the necessary skills, experience, and qualifications (use bullet points)..."
                  className="w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be]"
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
                  placeholder="Outline key deliverables and project responsibilities..."
                  className="w-full px-4 py-3 rounded-2xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] placeholder:text-[#9199a1] focus:outline-hidden focus:border-[#0058be]"
                />
              </div>
            </div>

            {/* Section 3: Skills & Competencies (Conflict 4 Resolution) */}
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
                  placeholder="Type to search and add skills (e.g. React, Python, Figma, Docker)..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c1c7ce] bg-white text-sm text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                />
                {filteredSkills.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#e0e3e5] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 space-y-1">
                    {filteredSkills.slice(0, 8).map((sk) => (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => handleAddSkill(sk)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[#191c1e] hover:bg-[#e8f0fe] hover:text-[#0058be] rounded-lg transition-colors flex items-center justify-between"
                      >
                        <span>{sk.value}</span>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSkills.length > 0 ? (
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
              ) : (
                <p className="text-xs text-[#71787e] italic">
                  No skills added yet. At least one required skill is recommended before publishing.
                </p>
              )}
            </div>

            {/* Section 4: Compensation & Perks (Figma Page 5) */}
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
                    placeholder="e.g. 120000"
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
                    placeholder="e.g. 160000"
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

              {/* Benefits list */}
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

          {/* Right Rail: Publishing Settings (Figma Page 4 & 5) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e0e3e5] space-y-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787e]">
                Publishing Settings
              </h3>

              {/* Company Info */}
              <div className="p-3.5 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0058be] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {company?.name?.slice(0, 2).toUpperCase() || 'CO'}
                </div>
                <div>
                  <div className="font-bold text-xs text-[#191c1e]">{company?.name || 'My Company'}</div>
                  <div className="text-[11px] text-[#71787e]">
                    Status: <span className="font-semibold text-[#0058be]">{company?.verification_status || 'PENDING'}</span>
                  </div>
                </div>
              </div>

              {/* Switches */}
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

              {/* Job Stages Button (Figma Page 5) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStagesModalOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-[#0058be] text-[#0058be] hover:bg-[#e8f0fe] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <GitCommit className="w-4 h-4" />
                  <span>+ Add / Configure Job Stages ({pipelineStages.length})</span>
                </button>
              </div>
            </div>

            {/* Pro Tip Card (Figma Page 4 & 5) */}
            <div className="bg-[#e8f0fe] rounded-3xl p-6 border border-[#c3d9fe] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0058be]">
                <Sparkles className="w-4 h-4" />
                <span>Pro Tip</span>
              </div>
              <p className="text-xs text-[#41474d] leading-relaxed">
                Job posts with clear salary ranges receive up to 35% more qualified applicants. Make sure to define realistic requirements to streamline your hiring pipeline.
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
        onSaveStages={(updated) => setPipelineStages(updated)}
      />
    </RecruiterLayout>
  );
}

