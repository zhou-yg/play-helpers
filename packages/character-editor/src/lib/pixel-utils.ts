/**
 * 前端像素处理工具函数
 */

/** 透明像素颜色值 */
export const TRANSPARENT_COLOR = '#00000000';

/** 判断颜色是否透明 */
export function isTransparent(color: string): boolean {
  if (!color) return true;
  const alpha = color.slice(7, 9);
  return alpha === '00';
}

/** 获取像素图的宽度 */
export function getPixelWidth(pixels: string[][]): number {
  if (!pixels || pixels.length === 0) return 0;
  return pixels[0]?.length ?? 0;
}

/** 获取像素图的高度 */
export function getPixelHeight(pixels: string[][]): number {
  return pixels?.length ?? 0;
}

/** 深拷贝像素数据 */
export function deepCopyPixels(pixels: string[][]): string[][] {
  return pixels.map(row => [...row]);
}

/** 创建空白像素数据 */
export function createEmptyPixels(width: number, height: number): string[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TRANSPARENT_COLOR)
  );
}

/** 水平翻转像素数据 */
export function mirrorHorizontal(pixels: string[][]): string[][] {
  return pixels.map(row => [...row].reverse());
}

/** 垂直翻转像素数据 */
export function mirrorVertical(pixels: string[][]): string[][] {
  return [...pixels].reverse().map(row => [...row]);
}

/** 顺时针旋转90度 */
export function rotate90(pixels: string[][]): string[][] {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const result: string[][] = [];
  for (let x = 0; x < w; x++) {
    const newRow: string[] = [];
    for (let y = h - 1; y >= 0; y--) {
      newRow.push(pixels[y][x]);
    }
    result.push(newRow);
  }
  return result;
}

/** 替换颜色 */
export function replaceColor(pixels: string[][], from: string, to: string): string[][] {
  return pixels.map(row =>
    row.map(color => (color.toLowerCase() === from.toLowerCase() ? to : color))
  );
}

/** 提取像素图中的所有唯一颜色 */
export function extractUniqueColors(pixels: string[][]): string[] {
  const colorSet = new Set<string>();
  for (const row of pixels) {
    for (const color of row) {
      if (!isTransparent(color)) {
        colorSet.add(color);
      }
    }
  }
  return Array.from(colorSet);
}

/** 解析 sizeClass 为宽度数值 */
export function parseSizeClass(sizeClass: string | undefined): number | null {
  if (!sizeClass) return null;
  const match = sizeClass.match(/^(\d+)w$/);
  return match ? parseInt(match[1], 10) : null;
}

/** 根据宽度生成 sizeClass */
export function toSizeClass(width: number): string {
  return `${width}w`;
}

/** 校验 sizeClass 是否匹配实际宽度 */
export function checkSizeClassMatch(
  sizeClass: string | undefined,
  actualWidth: number
): 'ok' | 'missing' | 'mismatch' {
  if (!sizeClass) return 'missing';
  const parsed = parseSizeClass(sizeClass);
  if (parsed === null) return 'mismatch';
  return parsed === actualWidth ? 'ok' : 'mismatch';
}
