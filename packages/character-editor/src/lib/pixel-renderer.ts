/**
 * 像素渲染核心逻辑
 * 将 PixelAsset.pixels 渲染到 Canvas
 */
import type { RenderOptions } from '../types';

export class PixelRenderer {
  /**
   * 渲染像素数据到 Canvas
   */
  render(
    ctx: CanvasRenderingContext2D,
    pixels: string[][],
    pixelSize: number,
    options?: RenderOptions
  ): void {
    const h = pixels.length;
    const w = pixels[0]?.length ?? 0;
    const offsetX = options?.offsetX || 0;
    const offsetY = options?.offsetY || 0;

    // 背景
    if (options?.bgColor) {
      ctx.fillStyle = options.bgColor;
      ctx.fillRect(offsetX, offsetY, w * pixelSize, h * pixelSize);
    }

    // 渲染像素
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = pixels[y][x];
        if (color && color.slice(7, 9) !== '00') {
          ctx.fillStyle = color;
          ctx.fillRect(
            offsetX + x * pixelSize,
            offsetY + y * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    // 网格
    if (options?.showGrid && pixelSize >= 4) {
      ctx.strokeStyle = options.gridColor || 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * pixelSize, offsetY);
        ctx.lineTo(offsetX + x * pixelSize, offsetY + h * pixelSize);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * pixelSize);
        ctx.lineTo(offsetX + w * pixelSize, offsetY + y * pixelSize);
        ctx.stroke();
      }
    }
  }

  /**
   * 生成缩略图 base64
   */
  generateThumbnail(pixels: string[][], thumbnailPixelSize: number = 4): string {
    const h = pixels.length;
    const w = pixels[0]?.length ?? 0;
    const canvas = document.createElement('canvas');
    canvas.width = w * thumbnailPixelSize;
    canvas.height = h * thumbnailPixelSize;
    const ctx = canvas.getContext('2d')!;

    // 棋盘格背景表示透明
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#cccccc' : '#999999';
        ctx.fillRect(x * thumbnailPixelSize, y * thumbnailPixelSize, thumbnailPixelSize, thumbnailPixelSize);
      }
    }

    this.render(ctx, pixels, thumbnailPixelSize);
    return canvas.toDataURL('image/png');
  }

  /**
   * 导出为图片 Blob
   */
  async exportToImage(
    pixels: string[][],
    pixelSize: number,
    format: 'png' | 'jpg' | 'webp' = 'png'
  ): Promise<Blob> {
    const h = pixels.length;
    const w = pixels[0]?.length ?? 0;
    const canvas = document.createElement('canvas');
    canvas.width = w * pixelSize;
    canvas.height = h * pixelSize;
    const ctx = canvas.getContext('2d')!;

    // 背景
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.render(ctx, pixels, pixelSize);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export image'));
        },
        `image/${format}`,
        format === 'jpg' ? 0.92 : undefined
      );
    });
  }
}

export const pixelRenderer = new PixelRenderer();
