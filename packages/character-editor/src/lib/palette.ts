/**
 * 调色板管理
 */
import type { Palette } from '../types';

/** 预设调色板 */
export const PALETTE_PRESETS: Palette[] = [
  {
    name: 'basic',
    colors: [
      '#000000FF', '#FFFFFFFF', '#FF0000FF', '#00FF00FF',
      '#0000FFFF', '#FFFF00FF', '#FF00FFFF', '#00FFFFFF',
      '#808080FF', '#C0C0C0FF', '#800000FF', '#008000FF',
      '#000080FF', '#808000FF', '#800080FF', '#008080FF',
    ],
  },
  {
    name: 'gameboy',
    colors: ['#0F380FFF', '#306230FF', '#8BAC0FFF', '#9BBC0FFF'],
  },
  {
    name: 'pastel',
    colors: [
      '#FFB3BAFF', '#FFDFBAFF', '#FFFFBAFF', '#BAFFC9FF',
      '#BAE1FFFF', '#E8BAFFFF', '#FFB3DEFF', '#B3FFE0FF',
      '#FFE0B3FF', '#B3D4FFFF', '#FFB3B3FF', '#B3FFB3FF',
    ],
  },
  {
    name: 'cyberpunk',
    colors: [
      '#0D0221FF', '#0F084BFF', '#26408BFF', '#A6CFD5FF',
      '#C2E7D9FF', '#00FFFFFF', '#FF00FFFF', '#FF00AAFF',
      '#FFFF00FF', '#FF5500FF', '#FF0000FF', '#0F0F0FFF',
    ],
  },
  {
    name: 'nature',
    colors: [
      '#2D5A27FF', '#4A7C3FFF', '#6B9B5EFF', '#8FBC8FFF',
      '#228B22FF', '#006400FF', '#8B4513FF', '#A0522DFF',
      '#DEB887FF', '#F5DEB3FF', '#87CEEBFF', '#4682B4FF',
    ],
  },
  {
    name: 'skin',
    colors: [
      '#FFDBACFF', '#F1C27DFF', '#E0AC69FF', '#C68642FF',
      '#8D5524FF', '#5C3317FF', '#3B1E08FF', '#FFE0BDFF',
      '#FFCD94FF', '#EAC086FF', '#CE9F6FFF', '#B07D56FF',
    ],
  },
];

/** 从像素数据提取唯一颜色 */
export function extractPaletteFromPixels(pixels: string[][]): Palette {
  const colorSet = new Set<string>();
  for (const row of pixels) {
    for (const color of row) {
      if (color && color.slice(7, 9) !== '00') {
        colorSet.add(color.toUpperCase());
      }
    }
  }
  return {
    name: 'extracted',
    colors: Array.from(colorSet),
  };
}

/** 获取预设调色板 */
export function getPresetPalette(name: string): Palette | undefined {
  return PALETTE_PRESETS.find(p => p.name === name);
}
