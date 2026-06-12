/**
 * 配置状态管理
 */
import { create } from 'zustand';
import type { AppConfig } from '../types';
import apiClient from '../lib/api';

const defaultConfig: AppConfig = {
  assetFolderPath: '',
  deepseekModel: 'deepseek-chat',
  defaultPixelSize: 16,
  defaultPalette: [
    '#000000FF', '#FFFFFFFF', '#FF0000FF', '#00FF00FF',
    '#0000FFFF', '#FFFF00FF', '#FF00FFFF', '#00FFFFFF',
    '#808080FF', '#C0C0C0FF', '#800000FF', '#008000FF',
    '#000080FF', '#808000FF', '#800080FF', '#008080FF',
  ],
  showGrid: true,
  canvasBgColor: '#222222',
};

interface ConfigState {
  config: AppConfig;
  loading: boolean;

  // Actions
  fetchConfig: () => Promise<void>;
  updateConfig: (partial: Partial<AppConfig>) => Promise<void>;
  setShowGrid: (show: boolean) => void;
  setPixelSize: (size: number) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: defaultConfig,
  loading: false,

  fetchConfig: async () => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get('/api/config');
      set({ config: { ...defaultConfig, ...data }, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateConfig: async (partial) => {
    const newConfig = { ...get().config, ...partial };
    set({ config: newConfig });
    try {
      await apiClient.put('/api/config', newConfig);
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  },

  setShowGrid: (show) => {
    get().updateConfig({ showGrid: show });
  },

  setPixelSize: (size) => {
    get().updateConfig({ defaultPixelSize: size });
  },
}));
