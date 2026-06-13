/**
 * @fileOverview pico.js — MIT, see https://github.com/nenadmarkus/picojs
 * @see https://github.com/nenadmarkus/pico
 * N. Markus, M. Frljak, I. S. Pandzic, J. Ahlberg and R. Forchheimer,
 * "Object Detection with Pixel Intensity Comparisons Organized in Decision Trees",
 * http://arxiv.org/abs/1305.4537
 */

/** Function that classifies a region (row, col, scale) as face or non-face. */
export type ClassifyRegion = (row: number, col: number, scale: number, pixels: Int8Array, ldim: number) => number;

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
  row: number;
  /** Column (x) of the detection-window center. */
  col: number;
  /** Side length of the square detection window. */
  size: number;
  /** Confidence score — higher values indicate a stronger match. */
  score: number;
}

export function unpackCascade(bytes: Int8Array): ClassifyRegion {
  const view = new DataView(new ArrayBuffer(4));
  let pos = 8;
  view.setUint8(0, bytes[pos + 0]);
  view.setUint8(1, bytes[pos + 1]);
  view.setUint8(2, bytes[pos + 2]);
  view.setUint8(3, bytes[pos + 3]);
  const treeDepth = view.getInt32(0, true);
  pos += 4;
  view.setUint8(0, bytes[pos + 0]);
  view.setUint8(1, bytes[pos + 1]);
  view.setUint8(2, bytes[pos + 2]);
  view.setUint8(3, bytes[pos + 3]);
  const nTrees = view.getInt32(0, true);
  pos += 4;
  const codeList: number[] = [];
  const predictionList: number[] = [];
  const thresholdList: number[] = [];
  const leafCount = Math.pow(2, treeDepth);
  for (let tree = 0; tree < nTrees; ++tree) {
    codeList.push(0, 0, 0, 0);
    for (let idx = 0; idx < 4 * leafCount - 4; ++idx) {
      codeList.push(bytes[pos + idx]);
    }
    pos += 4 * leafCount - 4;
    for (let idx = 0; idx < leafCount; ++idx) {
      view.setUint8(0, bytes[pos + 0]);
      view.setUint8(1, bytes[pos + 1]);
      view.setUint8(2, bytes[pos + 2]);
      view.setUint8(3, bytes[pos + 3]);
      predictionList.push(view.getFloat32(0, true));
      pos += 4;
    }
    view.setUint8(0, bytes[pos + 0]);
    view.setUint8(1, bytes[pos + 1]);
    view.setUint8(2, bytes[pos + 2]);
    view.setUint8(3, bytes[pos + 3]);
    thresholdList.push(view.getFloat32(0, true));
    pos += 4;
  }
  const codes = new Int8Array(codeList);
  const predictions = new Float32Array(predictionList);
  const thresholds = new Float32Array(thresholdList);

  return (row, col, scale, pixels, ldim) => {
    row = 256 * row;
    col = 256 * col;
    let root = 0;
    let sum = 0.0;
    for (let tree = 0; tree < nTrees; ++tree) {
      let idx = 1;
      for (let depth = 0; depth < treeDepth; ++depth) {
        idx =
          2 * idx +
          (pixels[
            ((row + codes[root + 4 * idx + 0] * scale) >> 8) * ldim + ((col + codes[root + 4 * idx + 1] * scale) >> 8)
          ] <=
          pixels[
            ((row + codes[root + 4 * idx + 2] * scale) >> 8) * ldim + ((col + codes[root + 4 * idx + 3] * scale) >> 8)
          ]
            ? 1
            : 0);
      }
      sum += predictions[leafCount * tree + idx - leafCount];
      if (sum <= thresholds[tree]) return -1;
      root += 4 * leafCount;
    }
    return sum - thresholds[nTrees - 1];
  };
}

export function runCascade(
  image: PicoImage,
  classifyRegion: ClassifyRegion,
  params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number },
): PicoDet[] {
  const { pixels, nrows, ncols, ldim } = image;
  const { shiftfactor, minsize, maxsize, scalefactor } = params;
  let scale = minsize;
  const dets: PicoDet[] = [];
  while (scale <= maxsize) {
    const step = Math.max(shiftfactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;
    for (let row = offset; row <= nrows - offset; row += step) {
      for (let col = offset; col <= ncols - offset; col += step) {
        const score = classifyRegion(row, col, scale, pixels, ldim);
        if (score > 0.0) {
          dets.push({ row, col, size: scale, score });
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
  dets = dets.sort((detA, detB) => detB.score - detA.score);
  function iou(d1: PicoDet, d2: PicoDet): number {
    const overRow = Math.max(
      0,
      Math.min(d1.row + d1.size / 2, d2.row + d2.size / 2) - Math.max(d1.row - d1.size / 2, d2.row - d2.size / 2),
    );
    const overCol = Math.max(
      0,
      Math.min(d1.col + d1.size / 2, d2.col + d2.size / 2) - Math.max(d1.col - d1.size / 2, d2.col - d2.size / 2),
    );
    return (overRow * overCol) / (d1.size * d1.size + d2.size * d2.size - overRow * overCol);
  }
  const assignments = new Array(dets.length).fill(0);
  const clusters: PicoDet[] = [];
  for (let idx = 0; idx < dets.length; ++idx) {
    if (assignments[idx] === 0) {
      let rowSum = 0,
        colSum = 0,
        sizeSum = 0,
        scoreSum = 0,
        count = 0;
      for (let jdx = idx; jdx < dets.length; ++jdx) {
        if (iou(dets[idx], dets[jdx]) > iouthreshold) {
          assignments[jdx] = 1;
          rowSum += dets[jdx].row;
          colSum += dets[jdx].col;
          sizeSum += dets[jdx].size;
          scoreSum += dets[jdx].score;
          count += 1;
        }
      }
      const meanScore = CLUSTER_Q_MODE === "mean" ? scoreSum / count : scoreSum;
      clusters.push({ row: rowSum / count, col: colSum / count, size: sizeSum / count, score: meanScore });
    }
  }
  return clusters;
}

export function instantiateDetectionMemory(size: number): (dets: PicoDet[]) => PicoDet[] {
  let slot = 0;
  const memory: PicoDet[][] = [];
  for (let idx = 0; idx < size; idx++) memory.push([]);

  return function updateMemory(dets: PicoDet[]): PicoDet[] {
    memory[slot] = dets.slice();
    slot = (slot + 1) % size;
    const all: PicoDet[] = [];
    for (let idx = 0; idx < size; idx++) for (let jdx = 0; jdx < memory[idx].length; jdx++) all.push(memory[idx][jdx]);
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
  for (let idx = 0; idx < nrows * ncols; idx++) {
    const pixel = pixels[idx] & 0xff;
    const offset = idx * 4;
    data[offset] = pixel;
    data[offset + 1] = pixel;
    data[offset + 2] = pixel;
    data[offset + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

export function grayscale(imgData: ImageData, width: number, height: number): PicoImage {
  const len = width * height;
  const pixels = new Int8Array(len);
  const data = imgData.data;
  for (let idx = 0; idx < len; ++idx) {
    const offset = idx * 4;
    pixels[idx] = (data[offset] * 77 + data[offset + 1] * 151 + data[offset + 2] * 28 + 128) >> 8;
  }
  return { pixels, nrows: height, ncols: width, ldim: width };
}
