import axiosClient from './axiosClient';

export const chatApi = {
  // Conversations
  getConversations: (params) => axiosClient.get('/conversations/', { params }),
  getConversationDetail: (id) => axiosClient.get(`/conversations/${id}/`),
  createConversation: (data) => axiosClient.post('/conversations/', data),

  // Messages
  getMessages: (conversationId, params) =>
    axiosClient.get(`/conversations/${conversationId}/messages/`, { params }),

  sendMessage: (conversationId, data) => {
    // If data is already a FormData instance, send as multipart
    if (data instanceof FormData) {
      return axiosClient.post(`/conversations/${conversationId}/messages/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axiosClient.post(`/conversations/${conversationId}/messages/`, data);
  },

  editMessage: (conversationId, messageId, data) =>
    axiosClient.patch(`/conversations/${conversationId}/messages/${messageId}/`, data),

  deleteMessage: (conversationId, messageId) =>
    axiosClient.delete(`/conversations/${conversationId}/messages/${messageId}/`),

  // Read status
  markAsRead: (conversationId) =>
    axiosClient.post(`/conversations/${conversationId}/read/`),

  getUnreadCount: () => axiosClient.get('/messaging/unread-count/'),

  // Moderation / Report
  reportChat: (conversationId, data) =>
    axiosClient.post(`/conversations/${conversationId}/report/`, data),
};

export default chatApi;
