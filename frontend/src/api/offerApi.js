import axiosClient from './axiosClient';

export const offerApi = {
  // Recruiter Endpoints
  getRecruiterApplicationOffer: (applicationId) =>
    axiosClient.get(`/recruiter/applications/${applicationId}/offer/`),

  saveOfferDraft: (applicationId, data) =>
    axiosClient.post(`/recruiter/applications/${applicationId}/offers/`, data),

  getOfferDetail: (offerId) =>
    axiosClient.get(`/recruiter/offers/${offerId}/`),

  updateOfferDraft: (offerId, data) =>
    axiosClient.patch(`/recruiter/offers/${offerId}/`, data),

  discardOfferDraft: (offerId) =>
    axiosClient.delete(`/recruiter/offers/${offerId}/`),

  sendOffer: (offerId) =>
    axiosClient.post(`/recruiter/offers/${offerId}/send/`),

  withdrawOffer: (offerId, data) =>
    axiosClient.post(`/recruiter/offers/${offerId}/withdraw/`, data),

  previewOfferLetter: (applicationId, data) =>
    axiosClient.post(`/recruiter/applications/${applicationId}/offers/preview-letter/`, data),

  uploadAttachment: (offerId, formData) =>
    axiosClient.post(`/recruiter/offers/${offerId}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteAttachment: (attId) =>
    axiosClient.delete(`/recruiter/offers/attachments/${attId}/`),

  getOfferTemplates: () =>
    axiosClient.get('/recruiter/offers/templates/'),

  getRecruiterOffers: (params) =>
    axiosClient.get('/recruiter/offers/', { params }),

  // Candidate Endpoints
  getCandidateApplicationOffer: (applicationId) =>
    axiosClient.get(`/candidate/applications/${applicationId}/offer/`),

  acceptOffer: (offerId) =>
    axiosClient.post(`/candidate/offers/${offerId}/accept/`),

  declineOffer: (offerId, data) =>
    axiosClient.post(`/candidate/offers/${offerId}/decline/`, data),

  getDeclineReasons: () =>
    axiosClient.get('/candidate/offers/decline-reasons/'),

  downloadOfferLetter: (offerId) =>
    axiosClient.get(`/candidate/offers/${offerId}/download/`, {
      responseType: 'blob',
    }),
};

export default offerApi;
