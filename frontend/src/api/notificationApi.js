import axiosClient from './axiosClient';

export const notificationApi = {
  // Personal notification queries & mutations
  getNotifications: (params) => axiosClient.get('/notifications/', { params }),
  getUnreadCount: () => axiosClient.get('/notifications/unread-count/'),
  markAsRead: (id) => axiosClient.post(`/notifications/${id}/read/`),
  markAllAsRead: () => axiosClient.post('/notifications/read-all/'),

  // Super Admin Broadcast Endpoints
  getAdminBroadcasts: (params) =>
    axiosClient.get('/notifications/admin/broadcasts/', { params }),
  createAdminBroadcast: (data) =>
    axiosClient.post('/notifications/admin/broadcasts/', data),
};

export default notificationApi;
