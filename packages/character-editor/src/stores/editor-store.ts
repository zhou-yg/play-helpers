/**
 * 编辑器状态管理
 */
import { create } from 'zustand';
import type { PixelTool, PixelAsset } from '../types';

interface EditorState {
  /** 编辑弹框是否打开 */
  isOpen: boolean;
  /** 当前工具 */
  tool: PixelTool;
  /** 当前颜色 */
  currentColor: string;
  /** 缩放级别 */
  zoom: number;
  /** 是否正在保存 */
  saving: boolean;

  // Actions
  openEditor: (assetPath: string, data: PixelAsset) => void;
  closeEditor: () => void;
  setTool: (tool: PixelTool) => void;
  setCurrentColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  setSaving: (saving: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  isOpen: false,
  tool: 'brush',
  currentColor: '#FFFFFFFF',
  zoom: 8,
  saving: false,

  openEditor: (assetPath, data) => set({ isOpen: true }),
  closeEditor: () => set({ isOpen: false }),
  setTool: (tool) => set({ tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(32, zoom)) }),
  setSaving: (saving) => set({ saving }),
}));
