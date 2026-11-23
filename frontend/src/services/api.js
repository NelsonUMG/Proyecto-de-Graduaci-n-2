import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 12000,
  withCredentials: true,
});

const unwrap = (request) => request.then((response) => response.data.data);
const mutate = (request) => unwrap(request).catch((error) => {
  window.dispatchEvent(new CustomEvent('vet-api-error', { detail: getApiError(error) }));
  throw error;
});

export const api = {
  login: (payload, portal) => unwrap(apiClient.post(`/auth/login/${portal}`, payload)),
  registerClient: (payload) => unwrap(apiClient.post('/auth/register-client', payload)),
  requestPasswordReset: (payload) => unwrap(apiClient.post('/auth/password/forgot', payload)),
  resetPassword: (payload) => unwrap(apiClient.post('/auth/password/reset', payload)),
  me: () => unwrap(apiClient.get('/auth/me')),
  logout: () => unwrap(apiClient.post('/auth/logout')),
  dashboard: () => unwrap(apiClient.get('/dashboard')),
  publicClinic: () => unwrap(apiClient.get('/public/clinic')),
  options: () => unwrap(apiClient.get('/catalog/options')),
  reports: () => unwrap(apiClient.get('/reports')),
  audit: () => unwrap(apiClient.get('/audit')),
  get: (url, config) => unwrap(apiClient.get(url, config)),
  post: (url, payload) => mutate(apiClient.post(url, payload)),
  put: (url, payload) => mutate(apiClient.put(url, payload)),
  uploadPetPhoto: (id, file) => {
    const data = new FormData();
    data.append('photo', file);
    return mutate(apiClient.post(`/pets/${id}/photo`, data));
  },
  patch: (url, payload) => mutate(apiClient.patch(url, payload)),
  delete: (url) => mutate(apiClient.delete(url)),
};

export const getApiError = (error) => {
  const details = error.response?.data?.details;
  if (Array.isArray(details) && details.length) {
    return details.join(' ');
  }
  return error.response?.data?.message || error.message || 'No se pudo completar la operacion.';
};
