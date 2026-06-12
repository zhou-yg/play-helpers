/**
 * 像素编辑逻辑 - 工具、填充、历史记录
 */
import type { PixelTool } from '../types';

const TRANSPARENT = '#00000000';
const MAX_HISTORY = 50;

/** 深拷贝像素数据 */
export function deepCopyPixels(pixels: string[][]): string[][] {
  return pixels.map(row => [...row]);
}

/** 洪水填充 */
export function floodFill(
  pixels: string[][],
  startX: number,
  startY: number,
  fillColor: string
): string[][] {
  const result = deepCopyPixels(pixels);
  const h = result.length;
  const w = result[0]?.length ?? 0;
  if (startX < 0 || startX >= w || startY < 0 || startY >= h) return result;

  const targetColor = result[startY][startX];
  if (targetColor === fillColor) return result;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (result[y][x] !== targetColor) continue;

    result[y][x] = fillColor;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return result;
}

/** 历史记录管理 */
export class HistoryManager {
  private history: string[][][] = [];
  private index = -1;

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.history.length - 1;
  }

  /** 获取当前状态 */
  getCurrent(): string[][] | null {
    if (this.index >= 0 && this.index < this.history.length) {
      return deepCopyPixels(this.history[this.index]);
    }
    return null;
  }

  /** 推入新状态 */
  push(pixels: string[][]): void {
    // 丢弃当前位置之后的历史
    this.history = this.history.slice(0, this.index + 1);
    this.history.push(deepCopyPixels(pixels));
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.index = this.history.length - 1;
  }

  /** 撤销 */
  undo(): string[][] | null {
    if (!this.canUndo) return null;
    this.index--;
    return this.getCurrent();
  }

  /** 重做 */
  redo(): string[][] | null {
    if (!this.canRedo) return null;
    this.index++;
    return this.getCurrent();
  }

  /** 初始化 */
  init(pixels: string[][]): void {
    this.history = [deepCopyPixels(pixels)];
    this.index = 0;
  }

  /** 重置 */
  reset(): void {
    this.history = [];
    this.index = -1;
  }
}

/** 应用像素编辑工具 */
export function applyTool(
  pixels: string[][],
  x: number,
  y: number,
  tool: PixelTool,
  currentColor: string
): string[][] {
  const result = deepCopyPixels(pixels);
  const h = result.length;
  const w = result[0]?.length ?? 0;

  if (x < 0 || x >= w || y < 0 || y >= h) return result;

  switch (tool) {
    case 'brush':
      result[y][x] = currentColor;
      break;
    case 'eraser':
      result[y][x] = TRANSPARENT;
      break;
    case 'fill':
      return floodFill(result, x, y, currentColor);
    case 'eyedropper':
      // 取色器不修改像素，只返回颜色
      break;
  }

  return result;
}

/** 获取像素颜色 */
export function getPixelColor(pixels: string[][], x: number, y: number): string {
  if (!pixels[y]?.[x]) return TRANSPARENT;
  return pixels[y][x];
}
