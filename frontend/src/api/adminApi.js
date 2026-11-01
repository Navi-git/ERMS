import axiosClient from './axiosClient';

export const adminApi = {
  getStats: () => axiosClient.get('/auth/admin/dashboard/stats/'),
  getUsers: (params) => axiosClient.get('/admin/users/', { params }),
  createAdmin: (data) => axiosClient.post('/admin/users/', data),
  getUserDetail: (id) => axiosClient.get(`/admin/users/${id}/`),
  suspendUser: (id, reason) => axiosClient.post(`/admin/users/${id}/suspend/`, { reason }),
  reactivateUser: (id) => axiosClient.post(`/admin/users/${id}/reactivate/`),
  deleteUser: (id) => axiosClient.delete(`/admin/users/${id}/`),
  restoreUser: (id) => axiosClient.post(`/admin/users/${id}/restore/`),
  sendPasswordReset: (id) => axiosClient.post(`/admin/users/${id}/reset-password/`),
};

export default adminApi;

