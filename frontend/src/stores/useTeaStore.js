import { create } from 'zustand';
import * as teasApi from '../api/teas';
import * as configApi from '../api/config';

export const useTeaStore = create((set, get) => ({
  teas: [],
  dimensions: [],
  teaFields: [],
  derivedMetrics: [],
  report: null,
  recommendText: '',
  reportStale: false,
  currentCardIndex: 0,

  loadData: async () => {
    const [teas, dimensions, teaFields, derivedMetrics] = await Promise.all([
      teasApi.fetchTeas(),
      configApi.fetchDimensions(),
      configApi.fetchTeaFields(),
      configApi.fetchDerivedMetrics(),
    ]);
    let report = null;
    try { report = await teasApi.fetchReport(); } catch { /* no report */ }
    set({
      teas: teas || [],
      dimensions: dimensions || [],
      teaFields: teaFields || [],
      derivedMetrics: derivedMetrics || [],
      report: report?.content || null,
      recommendText: report?.recommend || '',
      reportMeta: report ? { created_at: report.created_at, stale: report.stale } : null,
    });
  },

  addTea: async (data) => {
    const tea = await teasApi.createTea(data);
    const teas = [...get().teas, tea];
    set({ teas, currentCardIndex: teas.length - 1, reportStale: true, recommendText: '' });
  },

  updateTea: async (id, data) => {
    const updated = await teasApi.updateTea(id, data);
    set({ teas: get().teas.map(t => t.id === id ? { ...t, ...updated } : t), reportStale: true, recommendText: '' });
  },

  updateTeaLocal: (id, data) => {
    set({ teas: get().teas.map(t => t.id === id ? { ...t, ...data } : t) });
  },

  removeTea: async (id) => {
    await teasApi.deleteTea(id);
    const teas = get().teas.filter(t => t.id !== id);
    const idx = Math.min(get().currentCardIndex, Math.max(0, teas.length - 1));
    set({ teas, currentCardIndex: idx, reportStale: true, recommendText: '' });
  },

  setScore: async (id, key, val) => {
    const tea = get().teas.find(t => t.id === id);
    if (!tea) return;
    const currentVal = tea.scores?.[key] || 0;
    const newVal = currentVal === val ? 0 : val;
    const newScores = { ...tea.scores, [key]: newVal };
    set({ teas: get().teas.map(t => t.id === id ? { ...t, scores: newScores } : t), reportStale: true, recommendText: '' });
    await teasApi.updateTea(id, { scores: newScores });
  },

  uploadPhoto: async (id, file) => {
    const result = await teasApi.uploadPhoto(id, file);
    set({ teas: get().teas.map(t => t.id === id ? { ...t, photo: result.photo } : t) });
  },

  setCurrentCard: (idx) => set({ currentCardIndex: idx }),

  setReport: (content) => set({ report: content, reportStale: false }),

  setRecommendText: (text) => set({ recommendText: text }),

  setReportMeta: (meta) => set(state => ({
    reportMeta: meta ? { ...state.reportMeta, ...meta } : null,
  })),
}));
