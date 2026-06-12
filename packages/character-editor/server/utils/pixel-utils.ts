/**
 * 像素处理工具函数
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

/** 反色（非透明像素取反） */
export function invertColors(pixels: string[][]): string[][] {
  return pixels.map(row =>
    row.map(color => {
      if (isTransparent(color)) return color;
      const r = (255 - parseInt(color.slice(1, 3), 16)).toString(16).padStart(2, '0');
      const g = (255 - parseInt(color.slice(3, 5), 16)).toString(16).padStart(2, '0');
      const b = (255 - parseInt(color.slice(5, 7), 16)).toString(16).padStart(2, '0');
      const a = color.slice(7, 9);
      return `#${r}${g}${b}${a}`;
    })
  );
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

/** 添加描边 */
export function addOutline(pixels: string[][], outlineColor: string = '#000000FF'): string[][] {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const result = createEmptyPixels(w + 2, h + 2);

  // 先将原图偏移1px复制到结果中
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      result[y + 1][x + 1] = pixels[y][x];
    }
  }

  // 在非透明像素周围添加描边
  const outline = deepCopyPixels(result);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isTransparent(pixels[y][x])) {
        // 检查4邻域
        const neighbors = [
          [y, x - 1], [y, x + 1], [y - 1, x], [y + 1, x],
        ];
        for (const [ny, nx] of neighbors) {
          const ry = ny + 1;
          const rx = nx + 1;
          if (rx >= 0 && rx < w + 2 && ry >= 0 && ry < h + 2) {
            if (isTransparent(result[ry][rx])) {
              outline[ry][rx] = outlineColor;
            }
          }
        }
      }
    }
  }

  return outline;
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
