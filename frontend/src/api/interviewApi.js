import axiosClient from './axiosClient';

export const interviewApi = {
  // Recruiter Endpoints
  getRecruiterInterviews: (params) => axiosClient.get('/recruiter/interviews/', { params }),
  getRecruiterInterviewMetrics: () => axiosClient.get('/recruiter/interviews/metrics/'),
  getRecruiterInterviewDetail: (id) => axiosClient.get(`/recruiter/interviews/${id}/`),
  scheduleInterview: (data) => axiosClient.post('/recruiter/interviews/schedule/', data),
  rescheduleInterview: (id, data) => axiosClient.patch(`/recruiter/interviews/${id}/reschedule/`, data),
  cancelInterview: (id, data) => axiosClient.post(`/recruiter/interviews/${id}/cancel/`, data),
  markOutcome: (id, data) => axiosClient.post(`/recruiter/interviews/${id}/outcome/`, data),
  getScorecard: (id) => axiosClient.get(`/recruiter/interviews/${id}/scorecard/`),
  submitScorecard: (id, data) => axiosClient.post(`/recruiter/interviews/${id}/scorecard/`, data),
  updateScorecard: (id, data) => axiosClient.patch(`/recruiter/interviews/${id}/scorecard/`, data),
  nudgePanelist: (participantId) => axiosClient.post(`/recruiter/interviews/participants/${participantId}/nudge/`),

  // Candidate Endpoints
  getCandidateInterviews: (params) => axiosClient.get('/candidate/interviews/', { params }),
  getCandidateInterviewDetail: (id) => axiosClient.get(`/candidate/interviews/${id}/`),
  respondToInterview: (id, data) => axiosClient.post(`/candidate/interviews/${id}/respond/`, data),
  requestReschedule: (id, data) => axiosClient.post(`/candidate/interviews/${id}/request-reschedule/`, data),
};

export default interviewApi;
