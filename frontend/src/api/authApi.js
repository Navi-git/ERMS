import axiosClient from './axiosClient';

export const authApi = {
  register: (data) => axiosClient.post('/auth/register/', data),
  verifyOtp: (data) => axiosClient.post('/auth/verify-otp/', data),
  resendOtp: (data) => axiosClient.post('/auth/resend-otp/', data),
  login: (data) => axiosClient.post('/auth/login/', data),
  adminLogin: (data) => axiosClient.post('/auth/admin/login/', data),
  getAdminStats: () => axiosClient.get('/auth/admin/dashboard/stats/'),
  googleLogin: (data) => axiosClient.post('/auth/google/', data),
  refreshToken: (data) => axiosClient.post('/auth/token/refresh/', data),
  logout: (data) => axiosClient.post('/auth/logout/', data),
  getMe: () => axiosClient.get('/auth/me/'),
  requestPasswordReset: (data) => axiosClient.post('/auth/password-reset/request/', data),
  confirmPasswordReset: (data) => axiosClient.post('/auth/password-reset/confirm/', data),
};

export default authApi;
