/**
 * 素材状态管理
 */
import { create } from 'zustand';
import type { AssetInfo, PixelAsset } from '../types';
import apiClient from '../lib/api';

interface AssetState {
  /** 素材列表 */
  assets: AssetInfo[];
  /** 是否正在加载 */
  loading: boolean;
  /** 尺寸筛选 */
  sizeFilter: string | null;
  /** 当前正在编辑的素材路径 */
  editingAssetPath: string | null;
  /** 当前编辑的素材数据 */
  editingAssetData: PixelAsset | null;

  // Actions
  fetchAssets: () => Promise<void>;
  setAssets: (assets: AssetInfo[]) => void;
  setSizeFilter: (filter: string | null) => void;
  setEditingAsset: (path: string | null, data: PixelAsset | null) => void;
  deleteAsset: (path: string) => Promise<void>;
  createAsset: (name: string, width: number, height: number) => Promise<AssetInfo | null>;
  updateAsset: (path: string, data: PixelAsset) => Promise<void>;
  refreshAsset: (path: string) => Promise<void>;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  loading: false,
  sizeFilter: null,
  editingAssetPath: null,
  editingAssetData: null,

  fetchAssets: async () => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get('/api/assets');
      set({ assets: data.assets || [], loading: false });
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      set({ loading: false });
    }
  },

  setAssets: (assets) => set({ assets }),

  setSizeFilter: (filter) => set({ sizeFilter: filter }),

  setEditingAsset: (path, data) => set({ editingAssetPath: path, editingAssetData: data }),

  deleteAsset: async (path) => {
    try {
      await apiClient.delete('/api/asset', { params: { path } });
      set((state) => ({
        assets: state.assets.filter((a) => a.path !== path),
      }));
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  },

  createAsset: async (name, width, height) => {
    try {
      const { data: config } = await apiClient.get('/api/config');
      const { data: result } = await apiClient.post('/api/asset/new', {
        name,
        width,
        height,
        folderPath: config.assetFolderPath,
      });
      if (result.success) {
        await get().fetchAssets();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to create asset:', err);
      return null;
    }
  },

  updateAsset: async (path, data) => {
    try {
      await apiClient.put('/api/asset', { path, data });
    } catch (err) {
      console.error('Failed to update asset:', err);
    }
  },

  refreshAsset: async (path) => {
    try {
      const { data } = await apiClient.get('/api/asset', { params: { path } });
      set((state) => ({
        assets: state.assets.map((a) =>
          a.path === path
            ? {
                ...a,
                width: data.pixels?.[0]?.length ?? a.width,
                height: data.pixels?.length ?? a.height,
                partType: data.meta?.partType,
                sizeClass: data.meta?.sizeClass,
              }
            : a
        ),
        editingAssetData: state.editingAssetPath === path ? data : state.editingAssetData,
      }));
    } catch (err) {
      console.error('Failed to refresh asset:', err);
    }
  },
}));
