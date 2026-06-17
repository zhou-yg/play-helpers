/**
 * Grid line refinement — snap grid lines to nearby gradient edges.
 */

import { type RGBImage } from "./types";
import { rgbToGray, sobelXY, gradientColProjection, gradientRowProjection } from "./image-utils";

/**
 * Find the best grid line position near `origin` by looking for gradient peaks
 * within [origin - rangeMin, origin + rangeMax].
 */
function findBestGrid(origin: number, rangeMin: number, rangeMax: number, gradMag: Float64Array, thr: number = 0): number {
  let best = Math.round(origin);
  const peaks: [number, number][] = []; // [magnitude, position]

  const mx = maxVal(gradMag);
  if (mx < 1e-6) return best;

  const relThr = mx * thr;

  for (let i = -Math.round(rangeMin); i <= Math.round(rangeMax); i++) {
    const candidate = Math.round(origin + i);
    if (candidate <= 0 || candidate >= gradMag.length - 1) continue;
    if (
      gradMag[candidate] > gradMag[candidate - 1] &&
      gradMag[candidate] > gradMag[candidate + 1] &&
      gradMag[candidate] >= relThr
    ) {
      peaks.push([gradMag[candidate], candidate]);
    }
  }

  if (peaks.length === 0) return best;

  // Return position of brightest peak
  peaks.sort((a, b) => b[0] - a[0]);
  return peaks[0][1];
}

/**
 * Refine grid lines by snapping them to gradient edges.
 *
 * Starting from image center, expands outward by `cellW`/`cellH` steps,
 * and at each step adjusts the grid line to the nearest gradient peak
 * within `±cellSize * refineIntensity`.
 *
 * Returns sorted arrays of x-coordinates and y-coordinates for grid lines.
 */
export function refineGrids(
  image: RGBImage,
  gridX: number,
  gridY: number,
  refineIntensity: number = 0.25,
): { xCoords: number[]; yCoords: number[] } {
  const H = image.height;
  const W = image.width;
  const cellW = W / gridX;
  const cellH = H / gridY;

  const gray = rgbToGray(image);
  const { gx, gy } = sobelXY(gray, 3);

  const gradXSum = gradientColProjection(gx);
  const gradYSum = gradientRowProjection(gy);

  const xCoords: number[] = [];
  const yCoords: number[] = [];

  // Expand X grid from center to right
  let x = findBestGrid(W / 2, cellW, cellW, gradXSum);
  while (x < W + cellW / 2) {
    x = findBestGrid(x, cellW * refineIntensity, cellW * refineIntensity, gradXSum);
    xCoords.push(x);
    x += cellW;
  }

  // Expand X grid from center to left
  x = findBestGrid(W / 2, cellW, cellW, gradXSum) - cellW;
  while (x > -cellW / 2) {
    x = findBestGrid(x, cellW * refineIntensity, cellW * refineIntensity, gradXSum);
    xCoords.push(x);
    x -= cellW;
  }

  // Expand Y grid from center downward
  let y = findBestGrid(H / 2, cellH, cellH, gradYSum);
  while (y < H + cellH / 2) {
    y = findBestGrid(y, cellH * refineIntensity, cellH * refineIntensity, gradYSum);
    yCoords.push(y);
    y += cellH;
  }

  // Expand Y grid from center upward
  y = findBestGrid(H / 2, cellH, cellH, gradYSum) - cellH;
  while (y > -cellH / 2) {
    y = findBestGrid(y, cellH * refineIntensity, cellH * refineIntensity, gradYSum);
    yCoords.push(y);
    y -= cellH;
  }

  xCoords.sort((a, b) => a - b);
  yCoords.sort((a, b) => a - b);

  return { xCoords, yCoords };
}

// ─── Helpers ──────────────────────────────────────────────────

function maxVal(v: Float64Array): number {
  let m = -Infinity;
  for (let i = 0; i < v.length; i++) {
    if (v[i] > m) m = v[i];
  }
  return m;
}
