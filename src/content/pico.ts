/**
 * @fileOverview pico.js — MIT, see https://github.com/nenadmarkus/picojs
 * @see https://github.com/nenadmarkus/pico
 * N. Markus, M. Frljak, I. S. Pandzic, J. Ahlberg and R. Forchheimer,
 * "Object Detection with Pixel Intensity Comparisons Organized in Decision Trees",
 * http://arxiv.org/abs/1305.4537
 */

/** Grayscale image used as input for pico face detection. */
export interface PicoImage {
  /** Luma (brightness) values, one byte per pixel, row-major order. */
  pixels: Int8Array;
  /** Number of rows (height) in the image. */
  nrows: number;
  /** Number of columns (width) in the image. */
  ncols: number;
  /** Stride (number of columns including any padding). */
  ldim: number;
}

/** A single face detection result, in detection-image coordinates. */
export interface PicoDet {
  /** Row (y) of the detection-window center. */
  r: number;
  /** Column (x) of the detection-window center. */
  c: number;
  /** Side length of the square detection window. */
  s: number;
  /** Confidence score — higher values indicate a stronger match. */
  q: number;
}

export function unpackCascade(
  bytes: Int8Array,
): (r: number, c: number, s: number, pixels: Int8Array, ldim: number) => number {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8;
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;
  const tcodesLs: number[] = [];
  const tpredsLs: number[] = [];
  const threshLs: number[] = [];
  const pow2tdepth = Math.pow(2, tdepth);
  for (let t = 0; t < ntrees; ++t) {
    tcodesLs.push(0, 0, 0, 0);
    for (let i = 0; i < 4 * pow2tdepth - 4; ++i) {
      tcodesLs.push(bytes[p + i]);
    }
    p += 4 * pow2tdepth - 4;
    for (let i = 0; i < pow2tdepth; ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpredsLs.push(dview.getFloat32(0, true));
      p += 4;
    }
    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    threshLs.push(dview.getFloat32(0, true));
    p += 4;
  }
  const tcodes = new Int8Array(tcodesLs);
  const tpreds = new Float32Array(tpredsLs);
  const thresh = new Float32Array(threshLs);

  return function classifyRegion(r: number, c: number, s: number, pixels: Int8Array, ldim: number): number {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;
    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        idx =
          2 * idx +
          (pixels[((r + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim + ((c + tcodes[root + 4 * idx + 1] * s) >> 8)] <=
          pixels[((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim + ((c + tcodes[root + 4 * idx + 3] * s) >> 8)]
            ? 1
            : 0);
      }
      o += tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

export function runCascade(
  image: PicoImage,
  classifyRegion: (r: number, c: number, s: number, pixels: Int8Array, ldim: number) => number,
  params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number },
): PicoDet[] {
  const { pixels, nrows, ncols, ldim } = image;
  const { shiftfactor, minsize, maxsize, scalefactor } = params;
  let scale = minsize;
  const dets: PicoDet[] = [];
  while (scale <= maxsize) {
    const step = Math.max(shiftfactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;
    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim);
        if (q > 0.0) {
          dets.push({ r, c, s: scale, q });
        }
      }
    }
    scale = scale * scalefactor;
  }
  return dets;
}

/**
 * Controls how `q` (confidence) is aggregated in `clusterDetections`.
 *
 * - `"sum"` — cluster `q` is the **sum** of all member detection scores.
 *   Original pico.js behaviour. Best for single-frame NMS, where larger
 *   clusters (more overlapping detections) naturally score higher.
 *   When combined with temporal memory (`instantiateDetectionMemory`),
 *   the accumulated score grows with `MEMORY_SIZE`, so the threshold in
 *   `detection-loop.ts` must account for the number of stored frames.
 *
 * - `"mean"` — cluster `q` is the **mean** per-detection score
 *   (sum ÷ cluster size).  Score no longer depends on cluster size or
 *   memory fill state, making it stable during temporal tracking.
 *   Designed to work with `ACQUIRE_SCORE` / `HOLD_SCORE` hysteresis.
 */
const CLUSTER_Q_MODE: "sum" | "mean" = "mean";

export function clusterDetections(dets: PicoDet[], iouthreshold: number): PicoDet[] {
  dets = dets.sort((a, b) => b.q - a.q);
  function iou(d1: PicoDet, d2: PicoDet): number {
    const overr = Math.max(0, Math.min(d1.r + d1.s / 2, d2.r + d2.s / 2) - Math.max(d1.r - d1.s / 2, d2.r - d2.s / 2));
    const overc = Math.max(0, Math.min(d1.c + d1.s / 2, d2.c + d2.s / 2) - Math.max(d1.c - d1.s / 2, d2.c - d2.s / 2));
    return (overr * overc) / (d1.s * d1.s + d2.s * d2.s - overr * overc);
  }
  const assignments = new Array(dets.length).fill(0);
  const clusters: PicoDet[] = [];
  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0,
        c = 0,
        s = 0,
        q = 0,
        n = 0;
      for (let j = i; j < dets.length; ++j) {
        if (iou(dets[i], dets[j]) > iouthreshold) {
          assignments[j] = 1;
          r += dets[j].r;
          c += dets[j].c;
          s += dets[j].s;
          q += dets[j].q;
          n += 1;
        }
      }
      const score = CLUSTER_Q_MODE === "mean" ? q / n : q;
      clusters.push({ r: r / n, c: c / n, s: s / n, q: score });
    }
  }
  return clusters;
}

export function instantiateDetectionMemory(size: number): (dets: PicoDet[]) => PicoDet[] {
  let n = 0;
  const memory: PicoDet[][] = [];
  for (let i = 0; i < size; i++) memory.push([]);

  return function updateMemory(dets: PicoDet[]): PicoDet[] {
    memory[n] = dets.slice();
    n = (n + 1) % size;
    const all: PicoDet[] = [];
    for (let i = 0; i < size; i++) for (let j = 0; j < memory[i].length; j++) all.push(memory[i][j]);
    return all;
  };
}

/**
 * Renders the grayscale pixel data from a `PicoImage` onto a canvas.
 */
export function renderPicoImage(img: PicoImage, canvas: HTMLCanvasElement): void {
  const { pixels, nrows, ncols } = img;
  canvas.width = ncols;
  canvas.height = nrows;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(ncols, nrows);
  const data = imageData.data;
  for (let i = 0; i < nrows * ncols; i++) {
    const v = pixels[i] & 0xff;
    const j = i * 4;
    data[j] = v;
    data[j + 1] = v;
    data[j + 2] = v;
    data[j + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

export function grayscale(imgData: ImageData, width: number, height: number): PicoImage {
  const len = width * height;
  const pixels = new Int8Array(len);
  const data = imgData.data;
  for (let i = 0; i < len; ++i) {
    const j = i * 4;
    pixels[i] = (data[j] * 77 + data[j + 1] * 151 + data[j + 2] * 28 + 128) >> 8;
  }
  return { pixels, nrows: height, ncols: width, ldim: width };
}
