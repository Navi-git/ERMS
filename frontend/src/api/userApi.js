import axiosClient from './axiosClient';

export const userApi = {
  getProfile: () => axiosClient.get('/users/me/'),
  updateProfile: (data) => axiosClient.patch('/users/me/', data),
  uploadPhoto: (formData) =>
    axiosClient.put('/users/me/photo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: () => axiosClient.delete('/users/me/photo/'),
  changePassword: (data) => axiosClient.post('/users/me/password/', data),
  getLinkedLogins: () => axiosClient.get('/users/me/linked-logins/'),
  unlinkLogin: (id) => axiosClient.delete(`/users/me/linked-logins/${id}/`),
};

export default userApi;

