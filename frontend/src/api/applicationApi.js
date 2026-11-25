import axiosClient from './axiosClient';

export const applicationApi = {
  // Candidate Application Actions
  applyToJob: (jobId, data) => axiosClient.post(`/jobs/${jobId}/apply/`, data),
  getCandidateApplications: (params) =>
    axiosClient.get('/candidate/applications/', { params }),
  getCandidateApplicationDetail: (id) =>
    axiosClient.get(`/candidate/applications/${id}/`),
  withdrawApplication: (id) =>
    axiosClient.post(`/candidate/applications/${id}/withdraw/`),
  getApplicationMaterials: (id) =>
    axiosClient.get(`/candidate/applications/${id}/materials/`),
  addApplicationMaterial: (id, data) =>
    axiosClient.post(`/candidate/applications/${id}/materials/`, data),
  deleteApplicationMaterial: (id, mid) =>
    axiosClient.delete(`/candidate/applications/${id}/materials/${mid}/`),

  // Recruiter Tracking & Screening
  getRecruiterApplications: (params) =>
    axiosClient.get('/recruiter/applications/', { params }),
  getRecruiterJobApplications: (jobId) =>
    axiosClient.get(`/recruiter/jobs/${jobId}/applications/`),
  getRecruiterApplicationDetail: (id) =>
    axiosClient.get(`/recruiter/applications/${id}/`),
  moveApplicationStage: (id, data) =>
    axiosClient.post(`/recruiter/applications/${id}/stage/`, data),
  shortlistApplication: (id) =>
    axiosClient.post(`/recruiter/applications/${id}/shortlist/`),
  rejectApplication: (id, data) =>
    axiosClient.post(`/recruiter/applications/${id}/reject/`, data),
  hireApplication: (id) =>
    axiosClient.post(`/recruiter/applications/${id}/hire/`),

  // Recruiter Internal Collaboration Notes
  getApplicationNotes: (id) =>
    axiosClient.get(`/recruiter/applications/${id}/notes/`),
  addApplicationNote: (id, data) =>
    axiosClient.post(`/recruiter/applications/${id}/notes/`, data),
  updateApplicationNote: (id, nid, data) =>
    axiosClient.patch(`/recruiter/applications/${id}/notes/${nid}/`, data),
  deleteApplicationNote: (id, nid) =>
    axiosClient.delete(`/recruiter/applications/${id}/notes/${nid}/`),
};

export default applicationApi;

