/**
 * Shared types for Perfect Pixel
 */

/** RGB image stored as flat Uint8ClampedArray in row-major order [R,G,B, R,G,B, ...] */
export type RGBImage = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

/** Result of getPerfectPixel */
export interface PerfectPixelResult {
  /** Refined pixel width */
  refinedW: number;
  /** Refined pixel height */
  refinedH: number;
  /** Output image data */
  image: RGBImage;
}

/** Options for getPerfectPixel */
export interface PerfectPixelOptions {
  /** Sampling method: "center", "median", or "majority" (default: "center") */
  sampleMethod?: "center" | "median" | "majority";
  /** Manually set grid size [gridW, gridH] to override auto-detection */
  gridSize?: [number, number] | null;
  /** Minimum pixel block size to consider valid (default: 4) */
  minSize?: number;
  /** Minimum peak width for FFT peak detection (default: 6) */
  peakWidth?: number;
  /** Grid refinement intensity [0, 0.5]. Search range = ±cellSize * refineIntensity (default: 0.25) */
  refineIntensity?: number;
  /** Whether to enforce output to be square when detected sizes differ by 1 (default: true) */
  fixSquare?: boolean;
}

/** 2D float matrix in row-major order */
export class Mat2D {
  readonly rows: number;
  readonly cols: number;
  readonly data: Float64Array;

  constructor(rows: number, cols: number, data?: Float64Array) {
    this.rows = rows;
    this.cols = cols;
    this.data = data ?? new Float64Array(rows * cols);
  }

  get(r: number, c: number): number {
    return this.data[r * this.cols + c];
  }

  set(r: number, c: number, v: number): void {
    this.data[r * this.cols + c] = v;
  }

  /** Get a full row as a Float64Array view */
  row(r: number): Float64Array {
    const offset = r * this.cols;
    return this.data.subarray(offset, offset + this.cols);
  }

  /** Extract a column into a new Float64Array */
  col(c: number): Float64Array {
    const out = new Float64Array(this.rows);
    for (let r = 0; r < this.rows; r++) {
      out[r] = this.data[r * this.cols + c];
    }
    return out;
  }

  clone(): Mat2D {
    return new Mat2D(this.rows, this.cols, new Float64Array(this.data));
  }
}

/** Complex number for FFT */
export interface Complex {
  re: number;
  im: number;
}
