/**
 * Pixel sampling methods — center, median, and majority.
 * Each method samples one color per grid cell from the original image.
 */

import { type RGBImage } from "./types";
import { createRGBImage, setPixel, getPixel } from "./image-utils";

// ─── Center sampling ──────────────────────────────────────────

/**
 * Sample the center pixel of each grid cell.
 * Fastest method, works well for clean pixel art.
 */
export function sampleCenter(
  image: RGBImage,
  xCoords: number[],
  yCoords: number[],
): RGBImage {
  const nCols = xCoords.length - 1;
  const nRows = yCoords.length - 1;
  const out = createRGBImage(nCols, nRows);

  const centersX = new Int32Array(nCols);
  const centersY = new Int32Array(nRows);

  for (let i = 0; i < nCols; i++) {
    centersX[i] = Math.min(
      Math.max(Math.round((xCoords[i] + xCoords[i + 1]) * 0.5), 0),
      image.width - 1,
    );
  }
  for (let j = 0; j < nRows; j++) {
    centersY[j] = Math.min(
      Math.max(Math.round((yCoords[j] + yCoords[j + 1]) * 0.5), 0),
      image.height - 1,
    );
  }

  for (let j = 0; j < nRows; j++) {
    for (let i = 0; i < nCols; i++) {
      const rgb = getPixel(image, centersX[i], centersY[j]);
      setPixel(out, i, j, rgb);
    }
  }

  return out;
}

// ─── Median sampling ──────────────────────────────────────────

/**
 * Sample the median color of each grid cell.
 * More robust to noise than center sampling.
 */
export function sampleMedian(
  image: RGBImage,
  xCoords: number[],
  yCoords: number[],
): RGBImage {
  const nCols = xCoords.length - 1;
  const nRows = yCoords.length - 1;
  const out = createRGBImage(nCols, nRows);

  for (let j = 0; j < nRows; j++) {
    const ry0 = Math.min(Math.max(Math.floor(yCoords[j]), 0), image.height);
    const ry1 = Math.min(Math.max(Math.ceil(yCoords[j + 1]), 0), image.height);

    for (let i = 0; i < nCols; i++) {
      const rx0 = Math.min(Math.max(Math.floor(xCoords[i]), 0), image.width);
      const rx1 = Math.min(Math.max(Math.ceil(xCoords[i + 1]), 0), image.width);

      if (rx1 <= rx0 || ry1 <= ry0) {
        setPixel(out, i, j, [0, 0, 0]);
        continue;
      }

      const n = (ry1 - ry0) * (rx1 - rx0);
      const rArr = new Float64Array(n);
      const gArr = new Float64Array(n);
      const bArr = new Float64Array(n);

      let idx = 0;
      for (let r = ry0; r < ry1; r++) {
        for (let c = rx0; c < rx1; c++) {
          const rgb = getPixel(image, c, r);
          rArr[idx] = rgb[0];
          gArr[idx] = rgb[1];
          bArr[idx] = rgb[2];
          idx++;
        }
      }

      rArr.sort();
      gArr.sort();
      bArr.sort();

      const mid = Math.floor(n / 2);
      const medianR = n % 2 !== 0 ? rArr[mid] : (rArr[mid - 1] + rArr[mid]) / 2;
      const medianG = n % 2 !== 0 ? gArr[mid] : (gArr[mid - 1] + gArr[mid]) / 2;
      const medianB = n % 2 !== 0 ? bArr[mid] : (bArr[mid - 1] + bArr[mid]) / 2;

      setPixel(out, i, j, [
        Math.round(medianR),
        Math.round(medianG),
        Math.round(medianB),
      ]);
    }
  }

  return out;
}

// ─── Majority sampling (K=2 clustering) ───────────────────────

/**
 * Sample the majority color of each grid cell using K=2 clustering.
 * Most robust to anti-aliasing and edge blending artifacts.
 *
 * For each cell:
 * 1. Pick two initial centers: c0 = first pixel, c1 = farthest pixel from c0
 * 2. Iterate: assign pixels to nearest center, update centers
 * 3. Return the center with more members
 */
export function sampleMajority(
  image: RGBImage,
  xCoords: number[],
  yCoords: number[],
  maxSamples: number = 128,
  iters: number = 6,
  seed: number = 42,
): RGBImage {
  const nCols = xCoords.length - 1;
  const nRows = yCoords.length - 1;
  const out = createRGBImage(nCols, nRows);

  // Simple seeded RNG (xorshift32)
  let rngState = seed | 0;
  function nextInt(min: number, max: number): number {
    rngState ^= rngState << 13;
    rngState ^= rngState >> 17;
    rngState ^= rngState << 5;
    return (Math.abs(rngState) % (max - min)) + min;
  }

  for (let j = 0; j < nRows; j++) {
    const ry0 = Math.min(Math.max(Math.floor(yCoords[j]), 0), image.height);
    const ry1 = Math.min(Math.max(Math.ceil(yCoords[j + 1]), 0), image.height);

    for (let i = 0; i < nCols; i++) {
      const rx0 = Math.min(Math.max(Math.floor(xCoords[i]), 0), image.width);
      const rx1 = Math.min(Math.max(Math.ceil(xCoords[i + 1]), 0), image.width);

      if (rx1 <= rx0 || ry1 <= ry0) {
        setPixel(out, i, j, [0, 0, 0]);
        continue;
      }

      // Collect cell pixels
      const cellW = rx1 - rx0;
      const cellH = ry1 - ry0;
      const total = cellW * cellH;

      // Flatten cell pixels into arrays
      let rArr: Float64Array;
      let gArr: Float64Array;
      let bArr: Float64Array;

      if (total > maxSamples) {
        rArr = new Float64Array(maxSamples);
        gArr = new Float64Array(maxSamples);
        bArr = new Float64Array(maxSamples);
        for (let s = 0; s < maxSamples; s++) {
          const rr = ry0 + nextInt(0, cellH);
          const cc = rx0 + nextInt(0, cellW);
          const rgb = getPixel(image, cc, rr);
          rArr[s] = rgb[0];
          gArr[s] = rgb[1];
          bArr[s] = rgb[2];
        }
      } else {
        rArr = new Float64Array(total);
        gArr = new Float64Array(total);
        bArr = new Float64Array(total);
        let idx = 0;
        for (let r = ry0; r < ry1; r++) {
          for (let c = rx0; c < rx1; c++) {
            const rgb = getPixel(image, c, r);
            rArr[idx] = rgb[0];
            gArr[idx] = rgb[1];
            bArr[idx] = rgb[2];
            idx++;
          }
        }
      }

      const n = rArr.length;

      if (n < 2) {
        setPixel(out, i, j, [Math.round(rArr[0]), Math.round(gArr[0]), Math.round(bArr[0])]);
        continue;
      }

      // Initialize: c0 = first pixel, c1 = farthest from c0
      let c0r = rArr[0], c0g = gArr[0], c0b = bArr[0];
      let maxDist = -1;
      let c1r = c0r, c1g = c0g, c1b = c0b;

      for (let k = 0; k < n; k++) {
        const dr = rArr[k] - c0r;
        const dg = gArr[k] - c0g;
        const db = bArr[k] - c0b;
        const d = dr * dr + dg * dg + db * db;
        if (d > maxDist) {
          maxDist = d;
          c1r = rArr[k];
          c1g = gArr[k];
          c1b = bArr[k];
        }
      }

      // K-means iterations
      const mask = new Uint8Array(n); // 0 = cluster 0, 1 = cluster 1

      for (let iter = 0; iter < iters; iter++) {
        // Assign
        let sum0r = 0, sum0g = 0, sum0b = 0, cnt0 = 0;
        let sum1r = 0, sum1g = 0, sum1b = 0, cnt1 = 0;

        for (let k = 0; k < n; k++) {
          const d0 = (rArr[k] - c0r) ** 2 + (gArr[k] - c0g) ** 2 + (bArr[k] - c0b) ** 2;
          const d1 = (rArr[k] - c1r) ** 2 + (gArr[k] - c1g) ** 2 + (bArr[k] - c1b) ** 2;
          if (d1 < d0) {
            mask[k] = 1;
            sum1r += rArr[k]; sum1g += gArr[k]; sum1b += bArr[k]; cnt1++;
          } else {
            mask[k] = 0;
            sum0r += rArr[k]; sum0g += gArr[k]; sum0b += bArr[k]; cnt0++;
          }
        }

        // Update centers
        if (cnt0 > 0) { c0r = sum0r / cnt0; c0g = sum0g / cnt0; c0b = sum0b / cnt0; }
        if (cnt1 > 0) { c1r = sum1r / cnt1; c1g = sum1g / cnt1; c1b = sum1b / cnt1; }
      }

      // Final assignment to pick majority
      let cnt0 = 0, cnt1 = 0;
      for (let k = 0; k < n; k++) {
        const d0 = (rArr[k] - c0r) ** 2 + (gArr[k] - c0g) ** 2 + (bArr[k] - c0b) ** 2;
        const d1 = (rArr[k] - c1r) ** 2 + (gArr[k] - c1g) ** 2 + (bArr[k] - c1b) ** 2;
        if (d1 < d0) cnt1++; else cnt0++;
      }

      const [fr, fg, fb] = cnt1 >= cnt0 ? [c1r, c1g, c1b] : [c0r, c0g, c0b];
      setPixel(out, i, j, [
        Math.min(255, Math.max(0, Math.round(fr))),
        Math.min(255, Math.max(0, Math.round(fg))),
        Math.min(255, Math.max(0, Math.round(fb))),
      ]);
    }
  }

  return out;
}
