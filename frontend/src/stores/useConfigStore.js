import { create } from 'zustand';
import * as configApi from '../api/config';

export const useConfigStore = create((set, get) => ({
  config: {},
  keyModified: false,

  loadConfig: async () => {
    const config = await configApi.fetchConfig();
    set({ config, keyModified: false });
  },

  saveConfig: async (data) => {
    await configApi.saveConfig(data);
    await get().loadConfig();
  },

  testConfig: async (data) => {
    return configApi.testConfig(data);
  },

  setKeyModified: (v) => set({ keyModified: v }),
}));
