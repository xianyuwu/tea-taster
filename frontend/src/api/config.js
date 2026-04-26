import { apiFetch } from './client';

export const fetchConfig = () => apiFetch('/api/config');
export const saveConfig = (data) => apiFetch('/api/config', { method: 'PUT', body: JSON.stringify(data) });
export const testConfig = (data) => apiFetch('/api/config/test', { method: 'POST', body: JSON.stringify(data) });
export const fetchDimensions = () => apiFetch('/api/dimensions');
export const saveDimensions = (dimensions) => apiFetch('/api/dimensions', { method: 'PUT', body: JSON.stringify({ dimensions }) });
export const fetchTeaFields = () => apiFetch('/api/tea-fields');
export const saveTeaFields = (teaFields) => apiFetch('/api/tea-fields', { method: 'PUT', body: JSON.stringify({ teaFields }) });
export const fetchDerivedMetrics = () => apiFetch('/api/derived-metrics');
export const saveDerivedMetrics = (derivedMetrics) => apiFetch('/api/derived-metrics', { method: 'PUT', body: JSON.stringify({ derivedMetrics }) });
