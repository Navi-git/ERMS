import axiosClient from './axiosClient';

export const masterDataApi = {
  // Public endpoints (open for search, dropdowns, registration)
  getCategoryItems: (category, params) =>
    axiosClient.get(`/master-data/${category}/`, { params }),

  getEmploymentTypes: () =>
    axiosClient.get('/master-data/employment-types/'),

  // Super Admin CRUD endpoints
  getAdminItems: (params) =>
    axiosClient.get('/admin/master-data/', { params }),

  createItem: (data) =>
    axiosClient.post('/admin/master-data/', data),

  getItemDetail: (id) =>
    axiosClient.get(`/admin/master-data/${id}/`),

  updateItem: (id, data) =>
    axiosClient.patch(`/admin/master-data/${id}/`, data),

  deleteItem: (id) =>
    axiosClient.delete(`/admin/master-data/${id}/`),

  reorderItems: (data) =>
    axiosClient.post('/admin/master-data/reorder/', data),

  // Skill Aliases & Synonyms
  getSkillAliases: () =>
    axiosClient.get('/admin/skill-aliases/'),

  createSkillAlias: (data) =>
    axiosClient.post('/admin/skill-aliases/', data),

  deleteSkillAlias: (id) =>
    axiosClient.delete(`/admin/skill-aliases/${id}/`),
};

export default masterDataApi;

