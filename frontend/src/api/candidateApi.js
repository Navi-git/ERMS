import axiosClient from './axiosClient';

export const candidateApi = {
  // Profile & Completeness
  getProfile: () => axiosClient.get('/candidate/profile/'),
  updateProfile: (data) => axiosClient.patch('/candidate/profile/', data),

  // Education
  getEducation: () => axiosClient.get('/candidate/education/'),
  createEducation: (data) => axiosClient.post('/candidate/education/', data),
  updateEducation: (id, data) => axiosClient.patch(`/candidate/education/${id}/`, data),
  deleteEducation: (id) => axiosClient.delete(`/candidate/education/${id}/`),

  // Experience
  getExperience: () => axiosClient.get('/candidate/experience/'),
  createExperience: (data) => axiosClient.post('/candidate/experience/', data),
  updateExperience: (id, data) => axiosClient.patch(`/candidate/experience/${id}/`, data),
  deleteExperience: (id) => axiosClient.delete(`/candidate/experience/${id}/`),

  // Skills
  getSkills: () => axiosClient.get('/candidate/skills/'),
  addSkill: (data) => axiosClient.post('/candidate/skills/', data),
  batchUpdateSkills: (data) => axiosClient.put('/candidate/skills/', data),
  deleteSkill: (id) => axiosClient.delete(`/candidate/skills/${id}/`),

  // Resumes
  getResumes: (includeArchived = false) =>
    axiosClient.get('/candidate/resumes/', {
      params: { include_archived: includeArchived },
    }),
  uploadResume: (formData, onUploadProgress) =>
    axiosClient.post('/candidate/resumes/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  getResumeDetail: (id) => axiosClient.get(`/candidate/resumes/${id}/`),
  setDefaultResume: (id) => axiosClient.post(`/candidate/resumes/${id}/set-default/`),
  archiveResume: (id) => axiosClient.post(`/candidate/resumes/${id}/archive/`),
  analyzeResume: (id) => axiosClient.post(`/candidate/resumes/${id}/analyze/`),
  downloadResume: (id) =>
    axiosClient.get(`/candidate/resumes/${id}/download/`, {
      responseType: 'blob',
    }),

  // Recruiter Search
  searchCandidates: (params) => axiosClient.get('/recruiter/candidates/', { params }),
};
