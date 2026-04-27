import { apiFetch } from './client';

export const createBackup = () => apiFetch('/api/backup', { method: 'POST' });
export const fetchBackups = () => apiFetch('/api/backups');
export const deleteBackup = (filename) => apiFetch(`/api/backups/${filename}`, { method: 'DELETE' });
export const restoreBackup = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetch('/api/restore', { method: 'POST', body: fd });
};
export const clearAllData = () => apiFetch('/api/data?confirm=true', { method: 'DELETE' });
