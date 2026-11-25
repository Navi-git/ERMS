import axiosClient from './axiosClient';

export const adminApi = {
  // Dashboard & User Governance
  getStats: () => axiosClient.get('/auth/admin/dashboard/stats/'),
  getUsers: (params) => axiosClient.get('/admin/users/', { params }),
  createAdmin: (data) => axiosClient.post('/admin/users/', data),
  getUserDetail: (id) => axiosClient.get(`/admin/users/${id}/`),
  suspendUser: (id, reason) => axiosClient.post(`/admin/users/${id}/suspend/`, { reason }),
  reactivateUser: (id) => axiosClient.post(`/admin/users/${id}/reactivate/`),
  deleteUser: (id) => axiosClient.delete(`/admin/users/${id}/`),
  restoreUser: (id) => axiosClient.post(`/admin/users/${id}/restore/`),
  sendPasswordReset: (id) => axiosClient.post(`/admin/users/${id}/reset-password/`),

  // Company Verification Queue & Governance (Submodule 5.5)
  getCompanyQueue: (params) => axiosClient.get('/admin/companies/', { params }),
  getCompanyDetail: (id) => axiosClient.get(`/admin/companies/${id}/`),
  startCompanyReview: (id) => axiosClient.post(`/admin/companies/${id}/start-review/`),
  approveCompany: (id, data) => axiosClient.post(`/admin/companies/${id}/approve/`, data),
  rejectCompany: (id, rejection_reason) =>
    axiosClient.post(`/admin/companies/${id}/reject/`, { rejection_reason }),
  saveCompanyNote: (id, note) => axiosClient.post(`/admin/companies/${id}/notes/`, { note }),
};

export default adminApi;
