/**
 * Grid scale detection — FFT-based (primary) and gradient-based (fallback).
 */

import { type Mat2D } from "./types";
import { computeFFTMagnitude } from "./fft";
import { rgbToGray, sobelXY, gradientColProjection, gradientRowProjection, normalizeMinMax, smooth1D } from "./image-utils";

// ─── Peak detection on 1D projection ──────────────────────────

interface PeakCandidate {
  index: number;
  climb: number;
  fall: number;
  score: number;
}

/**
 * Detect the dominant peak spacing in a 1D projection.
 * Returns the half-distance between the strongest peaks on either side of center,
 * which corresponds to the pixel block size in that dimension.
 */
export function detectPeak(
  proj: Float64Array,
  peakWidth: number = 6,
  relThr: number = 0.35,
  minDist: number = 6,
): number | null {
  const center = Math.floor(proj.length / 2);

  const mx = max(proj);
  if (mx < 1e-6) return null;

  const thr = mx * relThr;
  const candidates: PeakCandidate[] = [];

  for (let i = 1; i < proj.length - 1; i++) {
    // Check that i is a peak of sufficient width
    let isPeak = true;
    for (let j = 1; j < peakWidth; j++) {
      if (i - j < 0 || i + j >= proj.length) continue;
      if (proj[i - j + 1] < proj[i - j] || proj[i + j - 1] < proj[i + j]) {
        isPeak = false;
        break;
      }
    }

    if (!isPeak || proj[i] < thr) continue;

    // Measure left climb
    let leftClimb = 0;
    for (let k = i; k > 0; k--) {
      if (proj[k] > proj[k - 1]) {
        leftClimb = Math.abs(proj[i] - proj[k - 1]);
      } else {
        break;
      }
    }

    // Measure right fall
    let rightFall = 0;
    for (let k = i; k < proj.length - 1; k++) {
      if (proj[k] > proj[k + 1]) {
        rightFall = Math.abs(proj[i] - proj[k + 1]);
      } else {
        break;
      }
    }

    candidates.push({
      index: i,
      climb: leftClimb,
      fall: rightFall,
      score: Math.max(leftClimb, rightFall),
    });
  }

  if (candidates.length === 0) return null;

  // Separate into left/right of center, with dead-zone
  const left = candidates
    .filter((c) => c.index < center - minDist && c.index > center * 0.25)
    .sort((a, b) => b.score - a.score);
  const right = candidates
    .filter((c) => c.index > center + minDist && c.index < center * 1.75)
    .sort((a, b) => b.score - a.score);

  if (left.length === 0 || right.length === 0) return null;

  // Pick the highest-scored peak on each side
  const peakLeft = left[0].index;
  const peakRight = right[0].index;

  return Math.abs(peakRight - peakLeft) / 2;
}

// ─── FFT-based grid estimation ────────────────────────────────

/**
 * Estimate grid size (gridW, gridH) using FFT magnitude analysis.
 * Returns null if estimation fails.
 */
export function estimateGridFFT(gray: Mat2D, peakWidth: number = 6): [number, number] | null {
  const H = gray.rows;
  const W = gray.cols;

  const mag = computeFFTMagnitude(gray);

  // Sum along rows/cols of the FFT magnitude
  const bandRow = Math.floor(W / 2);
  const bandCol = Math.floor(H / 2);

  // row_sum: sum along columns for each row (vertical periodicity → grid_h)
  const rowSum = new Float64Array(H);
  for (let r = 0; r < H; r++) {
    let sum = 0;
    for (let c = W / 2 - bandRow; c < W / 2 + bandRow; c++) {
      sum += mag.get(r, c);
    }
    rowSum[r] = sum;
  }

  // col_sum: sum along rows for each column (horizontal periodicity → grid_w)
  const colSum = new Float64Array(W);
  for (let c = 0; c < W; c++) {
    let sum = 0;
    for (let r = H / 2 - bandCol; r < H / 2 + bandCol; r++) {
      sum += mag.get(r, c);
    }
    colSum[c] = sum;
  }

  normalizeMinMax(rowSum);
  normalizeMinMax(colSum);

  const rowSmooth = smooth1D(rowSum, 17);
  const colSmooth = smooth1D(colSum, 17);

  const scaleRow = detectPeak(rowSmooth, peakWidth);
  const scaleCol = detectPeak(colSmooth, peakWidth);

  if (scaleRow === null || scaleCol === null || scaleCol <= 0) return null;

  const gridW = Math.round(scaleCol);
  const gridH = Math.round(scaleRow);
  return [gridW, gridH];
}

// ─── Gradient-based grid estimation (fallback) ────────────────

/**
 * Estimate grid size using Sobel gradient peak analysis.
 * Returns null if estimation fails.
 */
export function estimateGridGradient(gray: Mat2D, relThr: number = 0.2): [number, number] | null {
  const H = gray.rows;
  const W = gray.cols;

  const { gx, gy } = sobelXY(gray, 3);
  const gradXSum = gradientColProjection(gx);
  const gradYSum = gradientRowProjection(gy);

  const thrX = relThr * max(gradXSum);
  const thrY = relThr * max(gradYSum);

  const minInterval = 4;
  const peakX: number[] = [];
  const peakY: number[] = [];

  for (let i = 1; i < gradXSum.length - 1; i++) {
    if (
      gradXSum[i] > gradXSum[i - 1] &&
      gradXSum[i] > gradXSum[i + 1] &&
      gradXSum[i] >= thrX
    ) {
      if (peakX.length === 0 || i - peakX[peakX.length - 1] >= minInterval) {
        peakX.push(i);
      }
    }
  }

  for (let i = 1; i < gradYSum.length - 1; i++) {
    if (
      gradYSum[i] > gradYSum[i - 1] &&
      gradYSum[i] > gradYSum[i + 1] &&
      gradYSum[i] >= thrY
    ) {
      if (peakY.length === 0 || i - peakY[peakY.length - 1] >= minInterval) {
        peakY.push(i);
      }
    }
  }

  if (peakX.length < 4 || peakY.length < 4) return null;

  // Compute median intervals
  const intervalsX = intervals(peakX);
  const intervalsY = intervals(peakY);

  const scaleX = W / median(intervalsX);
  const scaleY = H / median(intervalsY);

  return [Math.round(scaleX), Math.round(scaleY)];
}

// ─── Unified detection ────────────────────────────────────────

/**
 * Detect grid scale from an RGB image.
 * Tries FFT first, falls back to gradient method.
 * Returns [gridW, gridH] or null.
 */
export function detectGridScale(
  image: { data: Uint8ClampedArray; width: number; height: number },
  peakWidth: number = 6,
  maxRatio: number = 1.5,
  minSize: number = 4.0,
): [number, number] | null {
  const gray = rgbToGray(image);
  const H = gray.rows;
  const W = gray.cols;

  let result = estimateGridFFT(gray, peakWidth);

  if (result === null) {
    console.warn("[PerfectPixel] FFT-based grid estimation failed, fallback to gradient-based method.");
    result = estimateGridGradient(gray);
  } else {
    const pixelSizeX = W / result[0];
    const pixelSizeY = H / result[1];
    const maxPixelSize = 20.0;
    if (
      Math.min(pixelSizeX, pixelSizeY) < minSize ||
      Math.max(pixelSizeX, pixelSizeY) > maxPixelSize ||
      pixelSizeX / pixelSizeY > maxRatio ||
      pixelSizeY / pixelSizeX > maxRatio
    ) {
      console.warn("[PerfectPixel] Inconsistent grid size detected (FFT-based), fallback to gradient-based method.");
      result = estimateGridGradient(gray);
    }
  }

  if (result === null) {
    console.warn("[PerfectPixel] Gradient-based grid estimation failed.");
    return null;
  }

  let [gridW, gridH] = result;
  let pixelSizeX = W / gridW;
  let pixelSizeY = H / gridH;

  if (pixelSizeX / pixelSizeY > maxRatio || pixelSizeY / pixelSizeX > maxRatio) {
    const pixelSize = Math.min(pixelSizeX, pixelSizeY);
    gridW = Math.round(W / pixelSize);
    gridH = Math.round(H / pixelSize);
  } else {
    const pixelSize = (pixelSizeX + pixelSizeY) / 2;
    gridW = Math.round(W / pixelSize);
    gridH = Math.round(H / pixelSize);
  }

  console.log(`[PerfectPixel] Detected pixel size: ${((W / gridW + H / gridH) / 2).toFixed(2)}`);
  return [gridW, gridH];
}

// ─── Helpers ──────────────────────────────────────────────────

function max(v: Float64Array): number {
  let m = -Infinity;
  for (let i = 0; i < v.length; i++) {
    if (v[i] > m) m = v[i];
  }
  return m;
}

function intervals(peaks: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    out.push(peaks[i] - peaks[i - 1]);
  }
  return out;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
