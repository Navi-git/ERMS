import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  DollarSign,
  Globe,
  Link2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import CandidateLayout from '../../layouts/CandidateLayout';
import { candidateApi } from '../../api/candidateApi';
import { resolvePhotoUrl } from '../../utils/imageUrl';
import { useToast } from '../../context/ToastContext';
import EditProfileModal from '../../components/candidate/EditProfileModal';
import AddEditExperienceModal from '../../components/candidate/AddEditExperienceModal';
import AddEditEducationModal from '../../components/candidate/AddEditEducationModal';
import AddSkillModal from '../../components/candidate/AddSkillModal';

export default function CandidateProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState(null);
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await candidateApi.getProfile();
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load candidate profile:', err);
      showToast('Failed to load profile data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Update Profile
  const handleSaveProfile = async (formData) => {
    try {
      const res = await candidateApi.updateProfile(formData);
      setProfile(res.data);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update profile.', 'error');
      throw err;
    }
  };

  // Experience Handlers
  const handleSaveExperience = async (formData) => {
    try {
      if (editingExp) {
        await candidateApi.updateExperience(editingExp.id, formData);
        showToast('Experience updated successfully!', 'success');
      } else {
        await candidateApi.createExperience(formData);
        showToast('Experience added successfully!', 'success');
      }
      loadProfile();
    } catch (err) {
      showToast('Failed to save experience.', 'error');
      throw err;
    }
  };

  const handleDeleteExperience = async (id) => {
    if (!window.confirm('Are you sure you want to delete this experience entry?')) return;
    try {
      await candidateApi.deleteExperience(id);
      showToast('Experience removed.', 'info');
      loadProfile();
    } catch (err) {
      showToast('Failed to delete experience.', 'error');
    }
  };

  // Education Handlers
  const handleSaveEducation = async (formData) => {
    try {
      if (editingEdu) {
        await candidateApi.updateEducation(editingEdu.id, formData);
        showToast('Education updated successfully!', 'success');
      } else {
        await candidateApi.createEducation(formData);
        showToast('Education added successfully!', 'success');
      }
      loadProfile();
    } catch (err) {
      showToast('Failed to save education record.', 'error');
      throw err;
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this education entry?')) return;
    try {
      await candidateApi.deleteEducation(id);
      showToast('Education removed.', 'info');
      loadProfile();
    } catch (err) {
      showToast('Failed to delete education.', 'error');
    }
  };

  // Skill Handlers
  const handleSaveSkill = async (formData) => {
    try {
      await candidateApi.addSkill(formData);
      showToast('Skill added to profile!', 'success');
      loadProfile();
    } catch (err) {
      showToast('Failed to add skill.', 'error');
      throw err;
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await candidateApi.deleteSkill(id);
      showToast('Skill removed.', 'info');
      loadProfile();
    } catch (err) {
      showToast('Failed to remove skill.', 'error');
    }
  };

  const seekingBadge = (status) => {
    if (status === 'actively_seeking') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● Actively Seeking
        </span>
      );
    }
    if (status === 'open_to_offers') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0058be] border border-blue-200">
          ● Open to Offers
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        ● Not Seeking
      </span>
    );
  };

  if (loading) {
    return (
      <CandidateLayout>
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-[#0058be] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Loading candidate profile...</p>
        </div>
      </CandidateLayout>
    );
  }

  const user = profile?.user || {};
  const completeness = profile?.completeness || { percentage: 0, missing_sections: [] };
  const avatarUrl = resolvePhotoUrl(user.profile_picture_url);

  return (
    <CandidateLayout>
      <div className="space-y-6">
        {/* Banner Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e5] shadow-xs overflow-hidden">
          {/* Cover gradient */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-[#e8f5ff] via-[#f0f4f9] to-[#e8eef8] border-b border-[#e2e8f0] relative">
            <div className="absolute inset-0 opacity-50 bg-[radial-gradient(#0058be_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>

          <div className="px-6 pb-6 pt-3 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 sm:-mt-20">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.full_name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-blue-100 text-[#0058be] ring-4 ring-white shadow-md flex items-center justify-center text-3xl font-black shrink-0">
                    {user.full_name?.charAt(0) || 'C'}
                  </div>
                )}
                <div className="mb-1">
                  {/* High-contrast dark charcoal name */}
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                    {user.full_name || 'Candidate Name'}
                  </h1>
                  {/* Bold vibrant brand blue headline */}
                  <p className="text-sm font-bold text-[#0058be] mt-0.5">
                    {profile.headline || 'No headline set'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#475569]">
                    {profile.current_location && (
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {profile.current_location}
                      </span>
                    )}
                    {seekingBadge(profile.seeking_status)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditProfileOpen(true)}
                className="px-4 py-2 rounded-xl bg-white border border-[#c3c7cb] hover:bg-slate-50 text-[#191c1e] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-end cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#0058be]" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Completeness Bar */}
        <div className="bg-white rounded-2xl border border-[#e0e3e5] p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0058be]" />
                <h3 className="font-bold text-sm text-[#191c1e]">Profile Completeness</h3>
                <span className="text-xs font-bold text-[#0058be] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {completeness.percentage}%
                </span>
              </div>
              <p className="text-xs text-[#71787e] mt-0.5">
                Profiles with 80%+ completeness receive 4x more direct outreach from top hiring managers.
              </p>
            </div>
            {completeness.missing_sections?.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {completeness.missing_sections.slice(0, 2).map((tip, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium"
                  >
                    + {tip}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Progress track */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-[#0058be] to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, completeness.percentage)}%` }}
            />
          </div>
        </div>

        {/* Main Grid: Left Column (About, Experience, Education) & Right Column (Skills, Details, Links) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans) */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Me Card */}
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-[#191c1e]">About Me</h3>
                <button
                  onClick={() => setEditProfileOpen(true)}
                  className="text-xs font-semibold text-[#0058be] hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
              <p className="text-xs text-[#41474d] leading-relaxed whitespace-pre-line">
                {profile.summary || (
                  <span className="text-slate-400 italic">
                    No summary provided yet. Click "Edit" to tell recruiters about your career achievements and goals.
                  </span>
                )}
              </p>
            </div>

            {/* Experience Section */}
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0058be]" />
                  <h3 className="text-base font-bold text-[#191c1e]">Work Experience</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {profile.experiences?.length || 0}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingExp(null);
                    setExpModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Experience
                </button>
              </div>

              {profile.experiences?.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No work experience added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Highlight your past roles, achievements, and impact.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-slate-100">
                  {profile.experiences.map((exp) => (
                    <div key={exp.id} className="pt-4 first:pt-0 group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#191c1e]">{exp.job_title}</h4>
                          <p className="text-xs font-medium text-[#0058be] flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {exp.company_name}
                            <span className="text-slate-300">•</span>
                            <span className="capitalize text-slate-600">{exp.employment_type?.replace('_', ' ')}</span>
                          </p>
                          <p className="text-[11px] text-[#71787e] mt-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {exp.start_date} – {exp.is_current ? 'Present' : exp.end_date || 'Present'}
                            {exp.location && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {exp.location}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingExp(exp);
                              setExpModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#0058be] hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit experience"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExperience(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete experience"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-[#41474d] mt-2 whitespace-pre-line leading-relaxed pl-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education Section */}
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#0058be]" />
                  <h3 className="text-base font-bold text-[#191c1e]">Education</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {profile.educations?.length || 0}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingEdu(null);
                    setEduModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Education
                </button>
              </div>

              {profile.educations?.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No education entries added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add your university, bootcamp, or degree details.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-slate-100">
                  {profile.educations.map((edu) => (
                    <div key={edu.id} className="pt-4 first:pt-0 group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#191c1e]">{edu.institution}</h4>
                          <p className="text-xs font-medium text-[#41474d] mt-0.5">
                            {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                          </p>
                          <p className="text-[11px] text-[#71787e] mt-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {edu.start_date} – {edu.is_currently_studying ? 'Present' : edu.end_date || 'Present'}
                            {edu.gpa && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-slate-700">GPA: {edu.gpa}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingEdu(edu);
                              setEduModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#0058be] hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit education"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEducation(edu.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete education"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 span) */}
          <div className="space-y-6">
            {/* Skills Card */}
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0058be]" />
                  <h3 className="font-bold text-sm text-[#191c1e]">Skills & Expertise</h3>
                </div>
                <button
                  onClick={() => setSkillModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0058be] text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {profile.skills?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No skills listed yet. Add skills to power ATS matching.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <div
                      key={s.id}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center gap-2 group hover:border-[#0058be] transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-[#191c1e]">{s.skill_name}</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <span className="capitalize">{s.proficiency_level}</span>
                          {s.years_of_experience && (
                            <span>• {s.years_of_experience} yrs</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSkill(s.id)}
                        className="text-slate-300 hover:text-red-500 opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Remove skill"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Candidate Preferences & Details */}
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-sm text-[#191c1e]">Candidate Details</h3>

              <div className="space-y-2.5 divide-y divide-slate-100 text-[#41474d]">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#71787e]">Expected Salary</span>
                  <span className="font-semibold text-[#191c1e]">
                    {profile.expected_salary_min || profile.expected_salary_max
                      ? `${profile.currency} ${profile.expected_salary_min?.toLocaleString() || 0} - ${profile.expected_salary_max?.toLocaleString() || '...'}`
                      : 'Not specified'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#71787e]">Willing to Relocate</span>
                  <span className={`font-semibold ${profile.willing_to_relocate ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {profile.willing_to_relocate ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#71787e]">Work Authorization</span>
                  <span className="font-semibold text-[#191c1e]">
                    {profile.work_authorization_status || 'Not specified'}
                  </span>
                </div>

                {profile.security_clearance && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[#71787e]">Security Clearance</span>
                    <span className="font-semibold text-[#191c1e]">{profile.security_clearance}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links & Portfolio */}
            <div className="bg-white rounded-2xl border border-[#e0e3e5] p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-sm text-[#191c1e]">Links & Social Profiles</h3>

              <div className="space-y-2">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 hover:bg-blue-50 text-[#0058be] font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      LinkedIn Profile
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      GitHub Profile
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Personal Portfolio
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && (
                  <p className="text-slate-400 italic">No links added yet.</p>
                )}
              </div>
            </div>

            {/* Quick Resume Link */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-[#0058be]" />
                <h4 className="font-bold text-xs text-[#0058be]">Resume Management</h4>
              </div>
              <p className="text-[11px] text-slate-600 mb-3">
                Upload your resumes and receive real-time ATS optimization scores.
              </p>
              <Link
                to="/candidate/resumes"
                className="block text-center w-full py-2 bg-[#0058be] hover:bg-[#004ca5] text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                Go to Resume Management
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editProfileOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {expModalOpen && (
        <AddEditExperienceModal
          initialData={editingExp}
          onClose={() => setExpModalOpen(false)}
          onSave={handleSaveExperience}
        />
      )}

      {eduModalOpen && (
        <AddEditEducationModal
          initialData={editingEdu}
          onClose={() => setEduModalOpen(false)}
          onSave={handleSaveEducation}
        />
      )}

      {skillModalOpen && (
        <AddSkillModal
          existingSkills={profile.skills}
          onClose={() => setSkillModalOpen(false)}
          onSave={handleSaveSkill}
        />
      )}
    </CandidateLayout>
  );
}
