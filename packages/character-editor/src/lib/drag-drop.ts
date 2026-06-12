/**
 * 拖拽管理
 */
import type { AssetInfo, CanvasItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

/** 拖拽类型标识 */
export const ASSET_DRAG_TYPE = 'ASSET_DRAG';

/** 从素材栏开始拖拽时的数据 */
export interface AssetDragItem {
  type: typeof ASSET_DRAG_TYPE;
  asset: AssetInfo;
}

/** 创建画布元素 */
export function createCanvasItem(asset: AssetInfo, x: number, y: number): CanvasItem {
  return {
    id: uuidv4(),
    assetPath: asset.path,
    x,
    y,
    scale: 1,
    pixelData: {
      name: asset.name,
      pixels: [], // 将在 drop 后异步加载
    },
  };
}

/** 计算吸附位置（按像素大小网格吸附） */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** 检测两个锚点是否接近（用于自动吸附） */
export function isAnchorNear(
  anchor1: { x: number; y: number },
  anchor2: { x: number; y: number },
  threshold: number = 8
): boolean {
  const dx = anchor1.x - anchor2.x;
  const dy = anchor1.y - anchor2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}
