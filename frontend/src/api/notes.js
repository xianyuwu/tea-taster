import { apiFetch } from './client';

export const fetchNotes = () => apiFetch('/api/notes');
export const createNote = (data) => apiFetch('/api/notes', { method: 'POST', body: JSON.stringify(data) });
export const updateNote = (id, data) => apiFetch(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNote = (id) => apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
