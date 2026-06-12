/**
 * 服务端渲染服务 - 缩略图生成
 */
import { createCanvas } from 'canvas';
import type { PixelAsset } from '../../src/types/index.js';
import { isTransparent } from '../utils/pixel-utils.js';

export class RenderService {
  /**
   * 生成缩略图 base64
   */
  generateThumbnail(pixels: string[][], pixelSize: number = 4): string {
    const h = pixels.length;
    const w = pixels[0]?.length ?? 0;
    const canvas = createCanvas(w * pixelSize, h * pixelSize);
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, w * pixelSize, h * pixelSize);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = pixels[y][x];
        if (!isTransparent(color)) {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * 导出为图片 Buffer
   */
  exportToImage(
    pixels: string[][],
    pixelSize: number,
    format: 'png' | 'jpg' = 'png'
  ): Buffer {
    const h = pixels.length;
    const w = pixels[0]?.length ?? 0;
    const canvas = createCanvas(w * pixelSize, h * pixelSize);
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, w * pixelSize, h * pixelSize);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = pixels[y][x];
        if (!isTransparent(color)) {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    if (format === 'jpg') {
      return canvas.toBuffer('image/jpeg');
    }
    return canvas.toBuffer('image/png');
  }
}

export const renderService = new RenderService();
