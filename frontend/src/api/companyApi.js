import axiosClient from './axiosClient';

export const companyApi = {
  // Public & Candidate Company Discovery (Submodule 5.2)
  getPublicCompanies: (params) => axiosClient.get('/companies/', { params }),
  getPublicCompanyDetail: (id) => axiosClient.get(`/companies/${id}/`),
  submitCompanyReview: (id, data) => axiosClient.post(`/companies/${id}/reviews/`, data),

  // Recruiter Company Management (Submodule 5.3)
  getRecruiterCompany: () => axiosClient.get('/recruiter/company/'),
  updateRecruiterCompany: (data) => axiosClient.patch('/recruiter/company/', data),
  uploadCompanyLogo: (formData) =>
    axiosClient.post('/recruiter/company/logo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadCompanyCover: (formData) =>
    axiosClient.post('/recruiter/company/cover/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Benefits Management
  getCompanyBenefits: () => axiosClient.get('/recruiter/company/benefits/'),
  createCompanyBenefit: (data) => axiosClient.post('/recruiter/company/benefits/', data),
  updateCompanyBenefit: (id, data) =>
    axiosClient.patch(`/recruiter/company/benefits/${id}/`, data),
  deleteCompanyBenefit: (id) => axiosClient.delete(`/recruiter/company/benefits/${id}/`),

  // Verification Workflow (Submodule 5.4)
  getVerificationStatus: () => axiosClient.get('/recruiter/company/verification/'),
  uploadVerificationDocument: (formData) =>
    axiosClient.post('/recruiter/company/verification/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadVerificationDocument: (docId) =>
    axiosClient.get(`/recruiter/company/verification/documents/${docId}/download/`, {
      responseType: 'blob',
    }),
  saveVerificationDraft: (data) =>
    axiosClient.post('/recruiter/company/verification/save-draft/', data),
  submitVerification: (data) =>
    axiosClient.post('/recruiter/company/verification/submit/', data),
};

export default companyApi;
