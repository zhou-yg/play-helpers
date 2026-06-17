/**
 * Image processing utilities — pure TypeScript, no external dependencies.
 * Works with RGBImage (Uint8ClampedArray) and Mat2D (Float64Array).
 */

import { type RGBImage, Mat2D } from "./types";

// ─── RGB → Grayscale ──────────────────────────────────────────

/** Convert RGB image to grayscale Mat2D using luminance weights. */
export function rgbToGray(image: RGBImage): Mat2D {
  const { data, width, height } = image;
  const gray = new Mat2D(height, width);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const idx = (r * width + c) * 3;
      const val = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      gray.set(r, c, val);
    }
  }
  return gray;
}

// ─── 2D Convolution (same-size output, reflect padding) ───────

function conv2DSame(image: Mat2D, kernel: number[][]): Mat2D {
  const kh = kernel.length;
  const kw = kernel[0].length;
  const ph = Math.floor(kh / 2);
  const pw = Math.floor(kw / 2);
  const { rows, cols } = image;

  // Reflect-pad
  const padded = new Mat2D(rows + 2 * ph, cols + 2 * pw);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      padded.set(r + ph, c + pw, image.get(r, c));
    }
  }
  // Fill border via reflection
  for (let r = 0; r < padded.rows; r++) {
    for (let c = 0; c < padded.cols; c++) {
      if (r >= ph && r < ph + rows && c >= pw && c < pw + cols) continue;
      const sr = Math.min(Math.max(r - ph, 0), rows - 1);
      const sc = Math.min(Math.max(c - pw, 0), cols - 1);
      padded.set(r, c, image.get(sr, sc));
    }
  }

  // Convolve
  const out = new Mat2D(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let kr = 0; kr < kh; kr++) {
        for (let kc = 0; kc < kw; kc++) {
          sum += kernel[kr][kc] * padded.get(r + kr, c + kc);
        }
      }
      out.set(r, c, sum);
    }
  }
  return out;
}

// ─── Sobel filters ────────────────────────────────────────────

const SOBEL_X_3: number[][] = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];

const SOBEL_Y_3: number[][] = [
  [-1, -2, -1],
  [ 0,  0,  0],
  [ 1,  2,  1],
];

const SOBEL_X_5: number[][] = [
  [-5, -4,  0,  4,  5],
  [-8,-10,  0, 10,  8],
  [-10,-20, 0, 20, 10],
  [-8,-10,  0, 10,  8],
  [-5, -4,  0,  4,  5],
];

const SOBEL_Y_5: number[][] = [
  [-5, -8, -10, -8, -5],
  [-4,-10, -20,-10, -4],
  [ 0,  0,   0,  0,  0],
  [ 4, 10,  20, 10,  4],
  [ 5,  8,  10,  8,  5],
];

/** Apply Sobel filter to grayscale image. Returns { gx, gy }. */
export function sobelXY(gray: Mat2D, kSize: 3 | 5 = 3): { gx: Mat2D; gy: Mat2D } {
  const kx = kSize === 3 ? SOBEL_X_3 : SOBEL_X_5;
  const ky = kSize === 3 ? SOBEL_Y_3 : SOBEL_Y_5;
  return {
    gx: conv2DSame(gray, kx),
    gy: conv2DSame(gray, ky),
  };
}

// ─── Gradient projections ─────────────────────────────────────

/** Sum of absolute gradient along each column → 1D array of length W */
export function gradientColProjection(gx: Mat2D): Float64Array {
  const { rows, cols } = gx;
  const out = new Float64Array(cols);
  for (let c = 0; c < cols; c++) {
    let sum = 0;
    for (let r = 0; r < rows; r++) {
      sum += Math.abs(gx.get(r, c));
    }
    out[c] = sum;
  }
  return out;
}

/** Sum of absolute gradient along each row → 1D array of length H */
export function gradientRowProjection(gy: Mat2D): Float64Array {
  const { rows, cols } = gy;
  const out = new Float64Array(rows);
  for (let r = 0; r < rows; r++) {
    let sum = 0;
    for (let c = 0; c < cols; c++) {
      sum += Math.abs(gy.get(r, c));
    }
    out[r] = sum;
  }
  return out;
}

// ─── 1D utilities ─────────────────────────────────────────────

/** Normalize a Float64Array to [0, 1] in-place and return it. */
export function normalizeMinMax(v: Float64Array): Float64Array {
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < v.length; i++) {
    if (v[i] < mn) mn = v[i];
    if (v[i] > mx) mx = v[i];
  }
  const range = mx - mn;
  if (range < 1e-8) {
    v.fill(0);
    return v;
  }
  for (let i = 0; i < v.length; i++) {
    v[i] = (v[i] - mn) / range;
  }
  return v;
}

/** 1D Gaussian smoothing (same convolution). */
export function smooth1D(v: Float64Array, k: number = 17): Float64Array {
  k = Math.round(k);
  if (k < 3) return new Float64Array(v);
  if (k % 2 === 0) k++;

  const sigma = k / 6.0;
  const half = Math.floor(k / 2);
  const kernel = new Float64Array(k);
  let kernelSum = 0;
  for (let i = 0; i < k; i++) {
    const x = i - half;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernelSum += kernel[i];
  }
  for (let i = 0; i < k; i++) kernel[i] /= kernelSum + 1e-8;

  const n = v.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < k; j++) {
      const idx = Math.min(Math.max(i - half + j, 0), n - 1);
      sum += kernel[j] * v[idx];
    }
    out[i] = sum;
  }
  return out;
}

// ─── RGBImage helpers ─────────────────────────────────────────

/** Create an RGBImage from an HTMLImageElement/HTMLCanvasElement via Canvas. */
export function imageFromHTMLImage(
  img: HTMLImageElement | HTMLCanvasElement | ImageBitmap
): RGBImage {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const rgba = ctx.getImageData(0, 0, img.width, img.height);

  // Convert RGBA (4 bytes/pixel) → RGB (3 bytes/pixel)
  const n = img.width * img.height;
  const rgb = new Uint8ClampedArray(n * 3);
  for (let i = 0; i < n; i++) {
    rgb[i * 3]     = rgba.data[i * 4];
    rgb[i * 3 + 1] = rgba.data[i * 4 + 1];
    rgb[i * 3 + 2] = rgba.data[i * 4 + 2];
  }

  return {
    data: rgb,
    width: img.width,
    height: img.height,
  };
}

/** Load an image from a URL and return RGBImage. */
export async function loadImage(url: string): Promise<RGBImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(imageFromHTMLImage(img));
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Create RGBImage from File/Blob */
export async function imageFromFile(file: File | Blob): Promise<RGBImage> {
  const bitmap = await createImageBitmap(file);
  return imageFromHTMLImage(bitmap);
}

/** Render RGBImage to a canvas element. */
export function renderToCanvas(image: RGBImage, canvas: HTMLCanvasElement): void {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;

  // Convert RGB (3 bytes/pixel) → RGBA (4 bytes/pixel, alpha=255)
  const n = image.width * image.height;
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4]     = image.data[i * 3];
    rgba[i * 4 + 1] = image.data[i * 3 + 1];
    rgba[i * 4 + 2] = image.data[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }

  const imageData = new ImageData(rgba, image.width, image.height);
  ctx.putImageData(imageData, 0, 0);
}

/** Scale an RGBImage up by factor using nearest-neighbor (pixel-perfect). */
export function scaleImageNearest(image: RGBImage, factor: number): RGBImage {
  const newW = image.width * factor;
  const newH = image.height * factor;
  const out = new Uint8ClampedArray(newW * newH * 3);

  for (let r = 0; r < newH; r++) {
    const sr = Math.floor(r / factor);
    for (let c = 0; c < newW; c++) {
      const sc = Math.floor(c / factor);
      const srcIdx = (sr * image.width + sc) * 3;
      const dstIdx = (r * newW + c) * 3;
      out[dstIdx] = image.data[srcIdx];
      out[dstIdx + 1] = image.data[srcIdx + 1];
      out[dstIdx + 2] = image.data[srcIdx + 2];
    }
  }

  return { data: out, width: newW, height: newH };
}

/** Create a blank RGBImage. */
export function createRGBImage(width: number, height: number): RGBImage {
  return {
    data: new Uint8ClampedArray(width * height * 3),
    width,
    height,
  };
}

/** Get pixel at (x, y) as [R, G, B]. */
export function getPixel(image: RGBImage, x: number, y: number): [number, number, number] {
  const idx = (y * image.width + x) * 3;
  return [image.data[idx], image.data[idx + 1], image.data[idx + 2]];
}

/** Set pixel at (x, y) from [R, G, B]. */
export function setPixel(image: RGBImage, x: number, y: number, rgb: [number, number, number]): void {
  const idx = (y * image.width + x) * 3;
  image.data[idx] = rgb[0];
  image.data[idx + 1] = rgb[1];
  image.data[idx + 2] = rgb[2];
}
