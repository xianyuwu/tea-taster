import { create } from 'zustand';
import * as authApi from '../api/auth';
import { setToken, clearToken } from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isFirstUser: false,
  loading: true,

  checkAuth: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  checkIfFirstUser: async () => {
    try {
      const has = await authApi.hasUsers();
      set({ isFirstUser: !has });
    } catch {
      set({ isFirstUser: true });
    }
  },

  login: async (username, password) => {
    await authApi.login(username, password);
    const user = await authApi.getMe();
    set({ user, isAuthenticated: true });
  },

  registerFirst: async (username, password) => {
    await authApi.registerFirst(username, password);
    const user = await authApi.getMe();
    set({ user, isAuthenticated: true, isFirstUser: false });
  },

  logout: () => {
    authApi.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
