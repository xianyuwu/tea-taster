import { apiFetch } from './client';

export const fetchTeas = () => apiFetch('/api/teas');
export const createTea = (data) => apiFetch('/api/teas', { method: 'POST', body: JSON.stringify(data) });
export const updateTea = (id, data) => apiFetch(`/api/teas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTea = (id) => apiFetch(`/api/teas/${id}`, { method: 'DELETE' });
export const uploadPhoto = (id, file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return apiFetch(`/api/teas/${id}/photo`, { method: 'POST', body: fd });
};
export const fetchReport = () => apiFetch('/api/report');
export const deleteReport = () => apiFetch('/api/report', { method: 'DELETE' });
