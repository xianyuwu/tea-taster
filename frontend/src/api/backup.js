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

export const downloadBackup = async (filename) => {
  const res = await apiFetch(`/api/backups/${filename}`, { rawResponse: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
