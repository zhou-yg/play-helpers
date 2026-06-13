import type { RGBColor, ProcessedImage } from '../types';
import {
  getPixelColor,
  setPixelAlpha,
  isColorInRange,
} from './colorUtils';

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export function removeBackground(
  source: HTMLImageElement,
  targetColors: RGBColor[],
  tolerance: number
): HTMLCanvasElement {
  const canvas = imageToCanvas(source);
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = getPixelColor(data, i);
    if (isColorInRange(pixel, targetColors, tolerance)) {
      setPixelAlpha(data, i, 0);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

function floodFillGetRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array
): Set<number> {
  const region = new Set<number>();
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = y * width + x;
    if (visited[idx]) continue;

    const pxIdx = idx * 4;
    if (data[pxIdx + 3] === 0) continue;

    visited[idx] = 1;
    region.add(idx);

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  return region;
}

export function autoSplit(
  sourceCanvas: HTMLCanvasElement
): HTMLCanvasElement[] {
  const ctx = sourceCanvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const data = imageData.data;
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const visited = new Uint8Array(width * height);
  const pieces: HTMLCanvasElement[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pxIdx = idx * 4;

      if (data[pxIdx + 3] === 0 || visited[idx]) continue;

      const region = floodFillGetRegion(data, width, height, x, y, visited);

      if (region.size < 4) continue;

      let minX = width, minY = height, maxX = 0, maxY = 0;
      for (const pi of region) {
        const px = pi % width;
        const py = Math.floor(pi / width);
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }

      const pieceW = maxX - minX + 1;
      const pieceH = maxY - minY + 1;
      const pieceCanvas = document.createElement('canvas');
      pieceCanvas.width = pieceW;
      pieceCanvas.height = pieceH;
      const pieceCtx = pieceCanvas.getContext('2d')!;

      pieceCtx.drawImage(
        sourceCanvas,
        minX, minY, pieceW, pieceH,
        0, 0, pieceW, pieceH
      );

      pieces.push(pieceCanvas);
    }
  }

  return pieces;
}

export function processImage(
  img: HTMLImageElement,
  targetColors: RGBColor[],
  tolerance: number,
  autoSplitEnabled: boolean,
  name: string,
  originalId: string
): ProcessedImage[] {
  const cleanedCanvas = removeBackground(img, targetColors, tolerance);

  const results: ProcessedImage[] = [
    {
      id: `${originalId}-cleaned`,
      originalId,
      dataUrl: canvasToDataUrl(cleanedCanvas),
      name: `${name}_cleaned`,
      isSplit: false,
    },
  ];

  if (autoSplitEnabled) {
    const pieces = autoSplit(cleanedCanvas);
    pieces.forEach((pieceCanvas, index) => {
      results.push({
        id: `${originalId}-split-${index}`,
        originalId,
        dataUrl: canvasToDataUrl(pieceCanvas),
        name: `${name}_part${index + 1}`,
        isSplit: true,
        splitIndex: index,
      });
    });
  }

  return results;
}
