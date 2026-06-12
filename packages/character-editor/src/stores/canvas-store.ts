/**
 * 画布状态管理
 */
import { create } from 'zustand';
import type { CanvasItem } from '../types';

interface CanvasState {
  /** 画布上的元素列表 */
  items: CanvasItem[];
  /** 画布偏移（平移） */
  panX: number;
  panY: number;
  /** 画布缩放 */
  zoom: number;
  /** 当前选中的元素 ID */
  selectedItemId: string | null;

  // Actions
  addItem: (item: CanvasItem) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, x: number, y: number) => void;
  updateItemData: (id: string, data: Partial<CanvasItem>) => void;
  selectItem: (id: string | null) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  items: [],
  panX: 0,
  panY: 0,
  zoom: 1,
  selectedItemId: null,

  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  moveItem: (id, x, y) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, x, y } : i)),
    })),

  updateItemData: (id, data) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    })),

  selectItem: (id) => set({ selectedItemId: id }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  clearCanvas: () => set({ items: [], selectedItemId: null }),
}));
