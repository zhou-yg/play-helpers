/**
 * Pure TypeScript 2D FFT implementation (Cooley-Tukey radix-2).
 * Uses native browser APIs (Float64Array) for performance.
 */

import { type Complex, Mat2D } from "./types";

// ─── Complex arithmetic helpers ────────────────────────────────

function cMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

// ─── 1D FFT (in-place, iterative Cooley-Tukey) ────────────────

function bitReverse(n: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (n & 1);
    n >>= 1;
  }
  return result;
}

/**
 * In-place 1D FFT on a Complex array.
 * Length must be a power of 2.
 */
function fft1d(data: Complex[], inverse: boolean = false): void {
  const n = data.length;
  const bits = Math.round(Math.log2(n));

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      [data[i], data[j]] = [data[j], data[i]];
    }
  }

  // Butterfly stages
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = (2 * Math.PI) / size * (inverse ? 1 : -1);
    const wN: Complex = { re: Math.cos(angle), im: Math.sin(angle) };

    for (let i = 0; i < n; i += size) {
      let w: Complex = { re: 1, im: 0 };
      for (let j = 0; j < halfSize; j++) {
        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;
        const t = cMul(w, data[oddIdx]);
        data[oddIdx] = cSub(data[evenIdx], t);
        data[evenIdx] = cAdd(data[evenIdx], t);
        w = cMul(w, wN);
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      data[i].re /= n;
      data[i].im /= n;
    }
  }
}

// ─── 2D FFT ───────────────────────────────────────────────────

/**
 * Compute 2D FFT on a Mat2D (real input).
 * Returns a Mat2D of complex values as two float arrays [real, imag].
 * The returned object has .re and .im Float64Arrays of size rows*cols.
 */
export interface ComplexMat2D {
  rows: number;
  cols: number;
  re: Float64Array;
  im: Float64Array;
}

function makeComplexArray(rows: number, cols: number): ComplexMat2D {
  return { rows, cols, re: new Float64Array(rows * cols), im: new Float64Array(rows * cols) };
}


/**
 * 2D FFT of a real-valued Mat2D. Returns complex result.
 * Input dimensions should ideally be powers of 2 (padded if needed).
 */
export function fft2d(input: Mat2D): ComplexMat2D {
  const { rows, cols } = input;
  const result = makeComplexArray(rows, cols);

  // Copy real input
  for (let i = 0; i < rows * cols; i++) {
    result.re[i] = input.data[i];
  }

  // FFT on each row
  const rowData: Complex[] = new Array(cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rowData[c] = { re: result.re[r * cols + c], im: 0 };
    }
    fft1d(rowData);
    for (let c = 0; c < cols; c++) {
      result.re[r * cols + c] = rowData[c].re;
      result.im[r * cols + c] = rowData[c].im;
    }
  }

  // FFT on each column
  const colData: Complex[] = new Array(rows);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      colData[r] = { re: result.re[r * cols + c], im: result.im[r * cols + c] };
    }
    fft1d(colData);
    for (let r = 0; r < rows; r++) {
      result.re[r * cols + c] = colData[r].re;
      result.im[r * cols + c] = colData[r].im;
    }
  }

  return result;
}

/**
 * FFT shift: swap quadrants so DC is centered.
 */
export function fftShift(cm: ComplexMat2D): ComplexMat2D {
  const { rows, cols } = cm;
  const result = makeComplexArray(rows, cols);

  const halfR = Math.floor(rows / 2);
  const halfC = Math.floor(cols / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const srcIdx = r * cols + c;
      const dstR = (r + halfR) % rows;
      const dstC = (c + halfC) % cols;
      const dstIdx = dstR * cols + dstC;
      result.re[dstIdx] = cm.re[srcIdx];
      result.im[dstIdx] = cm.im[srcIdx];
    }
  }

  return result;
}

/**
 * Compute FFT magnitude from complex matrix.
 * Applies 1 - log(1 + |F|) then normalizes to [0, 1].
 */
export function computeFFTMagnitude(gray: Mat2D): Mat2D {
  // Pad to next power of 2 if needed
  const padR = nextPow2(gray.rows);
  const padC = nextPow2(gray.cols);

  let padded: Mat2D;
  if (padR === gray.rows && padC === gray.cols) {
    padded = gray;
  } else {
    padded = new Mat2D(padR, padC);
    for (let r = 0; r < gray.rows; r++) {
      for (let c = 0; c < gray.cols; c++) {
        padded.set(r, c, gray.get(r, c));
      }
    }
  }

  const fftResult = fft2d(padded);
  const shifted = fftShift(fftResult);

  // Compute magnitude: 1 - log(1 + |F|)
  const mag = new Mat2D(shifted.rows, shifted.cols);
  for (let i = 0; i < shifted.rows * shifted.cols; i++) {
    const absVal = Math.sqrt(shifted.re[i] ** 2 + shifted.im[i] ** 2);
    mag.data[i] = 1 - Math.log1p(absVal);
  }

  // Normalize to [0, 1]
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < mag.data.length; i++) {
    if (mag.data[i] < mn) mn = mag.data[i];
    if (mag.data[i] > mx) mx = mag.data[i];
  }
  const range = mx - mn;
  if (range < 1e-8) {
    mag.data.fill(0);
  } else {
    for (let i = 0; i < mag.data.length; i++) {
      mag.data[i] = (mag.data[i] - mn) / range;
    }
  }

  // Crop back to original size if padded
  if (padR !== gray.rows || padC !== gray.cols) {
    const cropped = new Mat2D(gray.rows, gray.cols);
    for (let r = 0; r < gray.rows; r++) {
      for (let c = 0; c < gray.cols; c++) {
        cropped.set(r, c, mag.get(r, c));
      }
    }
    return cropped;
  }

  return mag;
}

function nextPow2(n: number): number {
  if (n <= 0) return 1;
  const log2 = Math.log2(n);
  if (Number.isInteger(log2)) return n;
  return 1 << Math.ceil(log2);
}
