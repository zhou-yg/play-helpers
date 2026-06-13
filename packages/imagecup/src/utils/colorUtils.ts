import type { RGBColor } from '../types';

export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(color: RGBColor): string {
  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function colorDistance(a: RGBColor, b: RGBColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function isColorInRange(
  pixel: RGBColor,
  targets: RGBColor[],
  tolerance: number
): boolean {
  return targets.some((target) => colorDistance(pixel, target) <= tolerance);
}

export function getPixelColor(
  data: Uint8ClampedArray,
  index: number
): RGBColor {
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
  };
}

export function setPixelAlpha(
  data: Uint8ClampedArray,
  index: number,
  alpha: number
): void {
  data[index + 3] = alpha;
}

export const PRESET_COLORS: { label: string; hex: string }[] = [
  { label: '纯白', hex: '#ffffff' },
  { label: '浅灰', hex: '#cccccc' },
  { label: '灰色', hex: '#808080' },
  { label: '深灰', hex: '#404040' },
  { label: '纯黑', hex: '#000000' },
  { label: '红色', hex: '#ff0000' },
  { label: '绿色', hex: '#00ff00' },
  { label: '蓝色', hex: '#0000ff' },
];
