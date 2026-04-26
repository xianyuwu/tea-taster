import { create } from 'zustand';
import * as notesApi from '../api/notes';

export const useNoteStore = create((set, get) => ({
  notes: [],
  search: '',
  activeTagFilter: null,
  page: 1,
  pageSize: 10,

  loadNotes: async () => {
    const notes = await notesApi.fetchNotes();
    set({ notes: notes || [] });
  },

  addNote: async (data) => {
    const note = await notesApi.createNote(data);
    set({ notes: [...get().notes, note] });
  },

  updateNote: async (id, data) => {
    const updated = await notesApi.updateNote(id, data);
    set({ notes: get().notes.map(n => n.id === id ? { ...n, ...updated } : n) });
  },

  removeNote: async (id) => {
    await notesApi.deleteNote(id);
    set({ notes: get().notes.filter(n => n.id !== id) });
  },

  setSearch: (search) => set({ search, page: 1 }),
  setTagFilter: (tag) => set({ activeTagFilter: tag, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  getFilteredNotes: () => {
    const { notes, search, activeTagFilter, page, pageSize } = get();
    let filtered = [...notes].reverse();
    if (activeTagFilter) {
      filtered = filtered.filter(n => n.tags?.includes(activeTagFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
      );
    }
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { notes: paged, total, page, pageSize };
  },

  getAllTags: () => {
    const tags = new Set();
    get().notes.forEach(n => n.tags?.forEach(t => tags.add(t)));
    return [...tags];
  },
}));
