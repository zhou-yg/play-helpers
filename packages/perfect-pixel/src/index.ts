/**
 * Perfect Pixel — Auto detect and get perfect pixel art.
 *
 * Pure TypeScript implementation for browser environments.
 * No external dependencies — uses only native Web APIs and typed arrays.
 *
 * @packageDocumentation
 */

// Re-export all types
export type { RGBImage, PerfectPixelResult, PerfectPixelOptions } from "./types";
export { Mat2D } from "./types";

// Re-export utilities for advanced usage
export {
  rgbToGray,
  sobelXY,
  normalizeMinMax,
  smooth1D,
  imageFromHTMLImage,
  loadImage,
  imageFromFile,
  renderToCanvas,
  scaleImageNearest,
  createRGBImage,
  getPixel,
  setPixel,
} from "./image-utils";

export { detectPeak, estimateGridFFT, estimateGridGradient, detectGridScale } from "./grid-detect";
export { refineGrids } from "./grid-refine";
export { sampleCenter, sampleMedian, sampleMajority } from "./sampling";

// Internal imports
import { type RGBImage, type PerfectPixelResult, type PerfectPixelOptions } from "./types";
import { detectGridScale } from "./grid-detect";
import { refineGrids } from "./grid-refine";
import { sampleCenter, sampleMedian, sampleMajority } from "./sampling";

/**
 * Transform a pixel-style image into a perfectly aligned pixel art.
 *
 * Automatically detects the grid structure of the input image, refines grid
 * lines to align with edges, then samples one color per grid cell.
 *
 * @param image - Input RGB image as `{ data: Uint8ClampedArray, width, height }`
 * @param options - Configuration options
 * @returns Refined pixel art result, or `null` if grid detection fails
 *
 * @example
 * ```typescript
 * import { getPerfectPixel, loadImage } from "@play-helpers/perfect-pixel";
 *
 * const image = await loadImage("pixel-art.png");
 * const result = getPerfectPixel(image, {
 *   sampleMethod: "center",
 *   refineIntensity: 0.3,
 * });
 *
 * if (result) {
 *   console.log(`Output: ${result.refinedW}×${result.refinedH}`);
 *   // result.image is an RGBImage you can render to canvas
 * }
 * ```
 */
export function getPerfectPixel(
  image: RGBImage,
  options: PerfectPixelOptions = {},
): PerfectPixelResult | null {
  const {
    sampleMethod = "center",
    gridSize = null,
    minSize = 4.0,
    peakWidth = 6,
    refineIntensity = 0.25,
    fixSquare = true,
  } = options;

  // Step 1: Detect grid size
  let scaleCol: number;
  let scaleRow: number;

  if (gridSize !== null) {
    [scaleCol, scaleRow] = gridSize;
  } else {
    const detected = detectGridScale(image, peakWidth, 1.5, minSize);
    if (detected === null) {
      console.warn("[PerfectPixel] Failed to estimate grid size.");
      return null;
    }
    [scaleCol, scaleRow] = detected;
  }

  const sizeX = Math.round(scaleCol);
  const sizeY = Math.round(scaleRow);

  // Step 2: Refine grid lines
  const { xCoords, yCoords } = refineGrids(image, sizeX, sizeY, refineIntensity);

  let refinedSizeX = xCoords.length - 1;
  let refinedSizeY = yCoords.length - 1;

  // Step 3: Sample pixels
  let scaledImage: RGBImage;
  switch (sampleMethod) {
    case "majority":
      scaledImage = sampleMajority(image, xCoords, yCoords);
      break;
    case "median":
      scaledImage = sampleMedian(image, xCoords, yCoords);
      break;
    case "center":
    default:
      scaledImage = sampleCenter(image, xCoords, yCoords);
      break;
  }

  // Step 4: Fix square (optional)
  if (fixSquare && Math.abs(refinedSizeX - refinedSizeY) === 1) {
    if (refinedSizeX > refinedSizeY) {
      if (refinedSizeX % 2 === 1) {
        // Remove one column
        scaledImage = cropImage(scaledImage, 0, 0, refinedSizeX - 1, refinedSizeY);
      } else {
        // Add one row by duplicating first row
        scaledImage = duplicateFirstRow(scaledImage);
      }
    } else {
      if (refinedSizeY % 2 === 1) {
        // Remove one row
        scaledImage = cropImage(scaledImage, 0, 0, refinedSizeX, refinedSizeY - 1);
      } else {
        // Add one column by duplicating first column
        scaledImage = duplicateFirstCol(scaledImage);
      }
    }
  }

  const finalH = scaledImage.height;
  const finalW = scaledImage.width;

  console.log(`[PerfectPixel] Refined grid size: (${finalW}, ${finalH})`);

  return {
    refinedW: finalW,
    refinedH: finalH,
    image: scaledImage,
  };
}

// ─── Helper functions ─────────────────────────────────────────

function cropImage(image: RGBImage, x0: number, y0: number, w: number, h: number): RGBImage {
  const out = new Uint8ClampedArray(w * h * 3);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const srcIdx = ((y0 + r) * image.width + (x0 + c)) * 3;
      const dstIdx = (r * w + c) * 3;
      out[dstIdx] = image.data[srcIdx];
      out[dstIdx + 1] = image.data[srcIdx + 1];
      out[dstIdx + 2] = image.data[srcIdx + 2];
    }
  }
  return { data: out, width: w, height: h };
}

function duplicateFirstRow(image: RGBImage): RGBImage {
  const newW = image.width;
  const newH = image.height + 1;
  const out = new Uint8ClampedArray(newW * newH * 3);
  // Copy first row
  const rowBytes = newW * 3;
  out.set(image.data.subarray(0, rowBytes), 0);
  // Copy entire original image after
  out.set(image.data, rowBytes);
  return { data: out, width: newW, height: newH };
}

function duplicateFirstCol(image: RGBImage): RGBImage {
  const newW = image.width + 1;
  const newH = image.height;
  const out = new Uint8ClampedArray(newW * newH * 3);
  for (let r = 0; r < newH; r++) {
    // Duplicate first column pixel
    const srcIdx = r * image.width * 3;
    out[(r * newW) * 3] = image.data[srcIdx];
    out[(r * newW) * 3 + 1] = image.data[srcIdx + 1];
    out[(r * newW) * 3 + 2] = image.data[srcIdx + 2];
    // Copy the rest
    for (let c = 0; c < image.width; c++) {
      const si = (r * image.width + c) * 3;
      const di = (r * newW + c + 1) * 3;
      out[di] = image.data[si];
      out[di + 1] = image.data[si + 1];
      out[di + 2] = image.data[si + 2];
    }
  }
  return { data: out, width: newW, height: newH };
}
