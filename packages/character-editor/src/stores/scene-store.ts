/**
 * 场景状态管理（多选、批量操作）
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Scene, SceneAsset, SizeAlert } from '../types';
import { checkSizeClassMatch, toSizeClass } from '../lib/pixel-utils';
import apiClient from '../lib/api';

interface SceneState {
  /** 场景列表 */
  scenes: Scene[];
  /** 当前活跃场景 */
  activeScene: Scene | null;
  /** 是否处于场景模式 */
  isSceneMode: boolean;
  /** 尺寸告警列表 */
  sizeAlerts: SizeAlert[];

  // Actions
  createScene: (name: string, config?: Partial<Scene['canvasConfig']>) => Promise<Scene>;
  deleteScene: (sceneId: string) => Promise<void>;
  enterSceneMode: (sceneId: string) => Promise<void>;
  exitSceneMode: () => void;
  addAssetToScene: (sceneId: string, assetPath: string, x: number, y: number) => Promise<void>;
  removeAssetFromScene: (sceneId: string, sceneAssetId: string) => Promise<void>;
  moveSceneAsset: (sceneId: string, sceneAssetId: string, x: number, y: number) => void;
  toggleSelectAsset: (sceneId: string, sceneAssetId: string, multi?: boolean) => void;
  boxSelectAssets: (sceneId: string, rect: { x1: number; y1: number; x2: number; y2: number }) => void;
  selectAll: () => void;
  clearSelection: () => void;
  getSelectedAssets: () => SceneAsset[];
  saveScene: (sceneId: string) => Promise<void>;
  fetchScenes: () => Promise<void>;
  checkSizeConsistency: () => SizeAlert[];
  autoFixSizeClass: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  activeScene: null,
  isSceneMode: false,
  sizeAlerts: [],

  createScene: async (name, config) => {
    const { data: scene } = await apiClient.post('/api/scene', {
      name,
      canvasConfig: config || {
        width: 512,
        height: 512,
        bgColor: '#222222',
        pixelSize: 16,
      },
    });
    set((state) => ({ scenes: [...state.scenes, scene] }));
    return scene;
  },

  deleteScene: async (sceneId) => {
    await apiClient.delete(`/api/scene/${sceneId}`);
    set((state) => ({
      scenes: state.scenes.filter((s) => s.id !== sceneId),
      activeScene: state.activeScene?.id === sceneId ? null : state.activeScene,
      isSceneMode: state.activeScene?.id === sceneId ? false : state.isSceneMode,
    }));
  },

  enterSceneMode: async (sceneId) => {
    try {
      const { data: scene } = await apiClient.get(`/api/scene/${sceneId}`);
      set({ activeScene: scene, isSceneMode: true });
    } catch (err) {
      console.error('Failed to load scene:', err);
    }
  },

  exitSceneMode: () => set({ isSceneMode: false }),

  addAssetToScene: async (sceneId, assetPath, x, y) => {
    const { data: updatedScene } = await apiClient.post(`/api/scene/${sceneId}/assets`, {
      assetPath, x, y, scale: 1,
    });
    set((state) => ({
      activeScene: state.activeScene?.id === sceneId ? updatedScene : state.activeScene,
    }));
  },

  removeAssetFromScene: async (sceneId, sceneAssetId) => {
    await apiClient.delete(`/api/scene/${sceneId}/assets/${sceneAssetId}`);
    set((state) => {
      if (!state.activeScene || state.activeScene.id !== sceneId) return state;
      return {
        activeScene: {
          ...state.activeScene,
          assets: state.activeScene.assets.filter((a) => a.id !== sceneAssetId),
          selectedAssetIds: state.activeScene.selectedAssetIds.filter((id) => id !== sceneAssetId),
        },
      };
    });
  },

  moveSceneAsset: (sceneId, sceneAssetId, x, y) => {
    set((state) => {
      if (!state.activeScene || state.activeScene.id !== sceneId) return state;
      return {
        activeScene: {
          ...state.activeScene,
          assets: state.activeScene.assets.map((a) =>
            a.id === sceneAssetId ? { ...a, x, y } : a
          ),
        },
      };
    });
  },

  toggleSelectAsset: (sceneId, sceneAssetId, multi = false) => {
    set((state) => {
      if (!state.activeScene || state.activeScene.id !== sceneId) return state;
      const assets = state.activeScene.assets.map((a) => {
        if (a.id === sceneAssetId) {
          return { ...a, selected: !a.selected };
        }
        if (!multi) {
          return { ...a, selected: false };
        }
        return a;
      });
      return {
        activeScene: {
          ...state.activeScene,
          assets,
          selectedAssetIds: assets.filter((a) => a.selected).map((a) => a.id),
        },
      };
    });
  },

  boxSelectAssets: (sceneId, rect) => {
    const x1 = Math.min(rect.x1, rect.x2);
    const y1 = Math.min(rect.y1, rect.y2);
    const x2 = Math.max(rect.x1, rect.x2);
    const y2 = Math.max(rect.y1, rect.y2);

    set((state) => {
      if (!state.activeScene || state.activeScene.id !== sceneId) return state;
      const assets = state.activeScene.assets.map((a) => {
        const assetRight = a.x + (a.pixelData.pixels[0]?.length ?? 0) * (state.activeScene!.canvasConfig.pixelSize * a.scale);
        const assetBottom = a.y + (a.pixelData.pixels.length ?? 0) * (state.activeScene!.canvasConfig.pixelSize * a.scale);
        const intersects = a.x < x2 && assetRight > x1 && a.y < y2 && assetBottom > y1;
        return { ...a, selected: intersects };
      });
      return {
        activeScene: {
          ...state.activeScene,
          assets,
          selectedAssetIds: assets.filter((a) => a.selected).map((a) => a.id),
        },
      };
    });
  },

  selectAll: () => {
    set((state) => {
      if (!state.activeScene) return state;
      const assets = state.activeScene.assets.map((a) => ({ ...a, selected: true }));
      return {
        activeScene: {
          ...state.activeScene,
          assets,
          selectedAssetIds: assets.map((a) => a.id),
        },
      };
    });
  },

  clearSelection: () => {
    set((state) => {
      if (!state.activeScene) return state;
      return {
        activeScene: {
          ...state.activeScene,
          assets: state.activeScene.assets.map((a) => ({ ...a, selected: false })),
          selectedAssetIds: [],
        },
      };
    });
  },

  getSelectedAssets: () => {
    const state = get();
    if (!state.activeScene) return [];
    return state.activeScene.assets.filter((a) => a.selected);
  },

  saveScene: async (sceneId) => {
    const state = get();
    if (!state.activeScene || state.activeScene.id !== sceneId) return;
    await apiClient.put(`/api/scene/${sceneId}`, state.activeScene);
  },

  fetchScenes: async () => {
    try {
      const { data } = await apiClient.get('/api/scenes');
      set({ scenes: data.scenes || [] });
    } catch (err) {
      console.error('Failed to fetch scenes:', err);
    }
  },

  checkSizeConsistency: () => {
    const state = get();
    const alerts: SizeAlert[] = [];
    if (!state.activeScene) return alerts;

    const assets = state.activeScene.assets;
    const sizeClassGroups = new Map<string, string[]>();

    for (const asset of assets) {
      const w = asset.pixelData.pixels[0]?.length ?? 0;
      const sc = asset.pixelData.meta?.sizeClass;
      const name = asset.pixelData.name;

      // 检查 sizeClass 是否与实际宽度一致
      const status = checkSizeClassMatch(sc, w);
      if (status === 'missing') {
        alerts.push({
          level: 'warning',
          message: `${name} 缺少 sizeClass`,
          assetPaths: [asset.assetPath],
          suggestion: `建议设置为 ${toSizeClass(w)}`,
        });
      } else if (status === 'mismatch') {
        alerts.push({
          level: 'error',
          message: `${name} 的 sizeClass(${sc}) 与实际宽度(${w})不一致`,
          assetPaths: [asset.assetPath],
        });
      }

      // 检查是否缺少 partType
      if (!asset.pixelData.meta?.partType) {
        alerts.push({
          level: 'warning',
          message: `${name} 缺少 partType`,
          assetPaths: [asset.assetPath],
        });
      }

      // 按 partType 分组检查同排宽度一致性
      const pt = asset.pixelData.meta?.partType;
      if (pt && sc) {
        const key = `${pt}-${sc}`;
        if (!sizeClassGroups.has(key)) sizeClassGroups.set(key, []);
        sizeClassGroups.get(key)!.push(name);
      }
    }

    set({ sizeAlerts: alerts });
    return alerts;
  },

  autoFixSizeClass: () => {
    set((state) => {
      if (!state.activeScene) return state;
      const assets = state.activeScene.assets.map((a) => {
        const w = a.pixelData.pixels[0]?.length ?? 0;
        const currentSc = a.pixelData.meta?.sizeClass;
        if (!currentSc || checkSizeClassMatch(currentSc, w) !== 'ok') {
          return {
            ...a,
            pixelData: {
              ...a.pixelData,
              meta: {
                ...a.pixelData.meta,
                sizeClass: toSizeClass(w),
              },
            },
          };
        }
        return a;
      });
      return { activeScene: { ...state.activeScene, assets } };
    });
  },
}));
