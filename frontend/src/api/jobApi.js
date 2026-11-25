import axiosClient from './axiosClient';

export const jobApi = {
  // Public & Discovery
  getJobs: (params) => axiosClient.get('/jobs/', { params }),
  getJob: (id) => axiosClient.get(`/jobs/${id}/`),
  getCompanyJobs: (companyId, params) =>
    axiosClient.get(`/jobs/companies/${companyId}/jobs/`, { params }),
  reportJob: (id, data) => axiosClient.post(`/jobs/${id}/report/`, data),

  // Candidate Saved Jobs
  getSavedJobs: (params) => axiosClient.get('/candidate/saved-jobs/', { params }),
  toggleSavedJob: (jobId) => axiosClient.post(`/candidate/saved-jobs/${jobId}/`),
  deleteSavedJob: (jobId) => axiosClient.delete(`/candidate/saved-jobs/${jobId}/`),

  // Recruiter Management
  getRecruiterJobs: (params) => axiosClient.get('/recruiter/jobs/', { params }),
  getRecruiterJob: (id) => axiosClient.get(`/recruiter/jobs/${id}/`),
  createJob: (data) => axiosClient.post('/recruiter/jobs/', data),
  updateJob: (id, data) => axiosClient.patch(`/recruiter/jobs/${id}/`, data),
  deleteJob: (id) => axiosClient.delete(`/recruiter/jobs/${id}/`),
  publishJob: (id) => axiosClient.post(`/recruiter/jobs/${id}/publish/`),
  holdJob: (id, data) => axiosClient.post(`/recruiter/jobs/${id}/hold/`, data),
  resumeJob: (id) => axiosClient.post(`/recruiter/jobs/${id}/resume/`),
  closeJob: (id) => axiosClient.post(`/recruiter/jobs/${id}/close/`),
  markJobFilled: (id) => axiosClient.post(`/recruiter/jobs/${id}/mark-filled/`),
  getJobOverview: (id) => axiosClient.get(`/recruiter/jobs/${id}/overview/`),

  // Recruiter Skills & Benefits
  updateJobSkills: (id, data) => axiosClient.put(`/recruiter/jobs/${id}/skills/`, data),
  updateJobBenefits: (id, data) => axiosClient.put(`/recruiter/jobs/${id}/benefits/`, data),

  // Recruiter Stages
  getJobStages: (id) => axiosClient.get(`/recruiter/jobs/${id}/stages/`),
  createJobStage: (id, data) => axiosClient.post(`/recruiter/jobs/${id}/stages/`, data),
  updateJobStage: (id, sid, data) =>
    axiosClient.patch(`/recruiter/jobs/${id}/stages/${sid}/`, data),
  deleteJobStage: (id, sid) =>
    axiosClient.delete(`/recruiter/jobs/${id}/stages/${sid}/`),
  reorderJobStages: (id, data) =>
    axiosClient.post(`/recruiter/jobs/${id}/stages/reorder/`, data),

  // Super Admin Oversight & Moderation
  getAdminJobs: (params) => axiosClient.get('/admin/jobs/', { params }),
  getAdminJob: (id) => axiosClient.get(`/admin/jobs/${id}/`),
  updateAdminJobStatus: (id, data) =>
    axiosClient.patch(`/admin/jobs/${id}/status/`, data),
  flagAdminJob: (id, data) => axiosClient.post(`/admin/jobs/${id}/flag/`, data),
  getAdminJobNotes: (id) => axiosClient.get(`/admin/jobs/${id}/notes/`),
  addAdminJobNote: (id, data) =>
    axiosClient.post(`/admin/jobs/${id}/notes/`, data),
};

export default jobApi;

