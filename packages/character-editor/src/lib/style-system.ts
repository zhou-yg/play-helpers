/**
 * 风格系统
 */
import type { StyleProfile } from '../types';

/** 预设风格 */
export const STYLE_PRESETS: StyleProfile[] = [
  {
    name: 'flat',
    renderStyle: 'flat',
  },
  {
    name: 'retro',
    renderStyle: 'flat',
    colorMapping: { hue: 15, saturation: -20, brightness: -10 },
  },
  {
    name: 'outline',
    renderStyle: 'outlined',
    postProcess: {
      outline: { color: '#000000FF', width: 1 },
    },
  },
  {
    name: 'soft',
    renderStyle: 'rounded',
    colorMapping: { hue: 0, saturation: -10, brightness: 10 },
  },
];

/** 获取预设风格 */
export function getPresetStyle(name: string): StyleProfile | undefined {
  return STYLE_PRESETS.find(s => s.name === name);
}

/** 应用颜色映射到像素数据 */
export function applyColorMapping(
  pixels: string[][],
  mapping?: { hue: number; saturation: number; brightness: number }
): string[][] {
  if (!mapping) return pixels;

  return pixels.map(row =>
    row.map(color => {
      if (!color || color.slice(7, 9) === '00') return color;

      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const a = color.slice(7, 9);

      // 简化的颜色映射：RGB 偏移
      let nr = Math.max(0, Math.min(255, r + mapping.brightness * 2.55));
      let ng = Math.max(0, Math.min(255, g + mapping.brightness * 2.55));
      let nb = Math.max(0, Math.min(255, b + mapping.brightness * 2.55));

      // 色相偏移（简化为通道旋转）
      if (mapping.hue !== 0) {
        const factor = mapping.hue / 360;
        const tr = nr;
        nr = nr * (1 - factor) + ng * factor;
        nb = nb * (1 - factor) + tr * factor;
      }

      // 饱和度调整
      if (mapping.saturation !== 0) {
        const gray = (nr + ng + nb) / 3;
        const satFactor = 1 + mapping.saturation / 100;
        nr = gray + (nr - gray) * satFactor;
        ng = gray + (ng - gray) * satFactor;
        nb = gray + (nb - gray) * satFactor;
      }

      nr = Math.max(0, Math.min(255, Math.round(nr)));
      ng = Math.max(0, Math.min(255, Math.round(ng)));
      nb = Math.max(0, Math.min(255, Math.round(nb)));

      return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}${a}`;
    })
  );
}
