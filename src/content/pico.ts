/**
 * @fileOverview pico.js — MIT, see https://github.com/nenadmarkus/picojs
 * @see https://github.com/nenadmarkus/pico
 * N. Markus, M. Frljak, I. S. Pandzic, J. Ahlberg and R. Forchheimer,
 * "Object Detection with Pixel Intensity Comparisons Organized in Decision Trees",
 * http://arxiv.org/abs/1305.4537
 */

/** Function that classifies a region (row, col, scale) as face or non-face. */
export type ClassifyRegion = (row: number, col: number, scale: number, pixels: Int8Array, width: number) => number;

/** Grayscale image used as input for pico face detection. */
export interface PicoImage {
  /** Luma (brightness) values, one byte per pixel, row-major order. */
  pixels: Int8Array;
  /** Number of rows (height) in the image. */
  height: number;
  /** Number of columns (width) in the image. */
  width: number;
}

/** Sliding-window parameters for the cascade classifier. */
export interface CascadeParams {
  /** Window moves by this fraction of its size each step. */
  shiftFactor: number;
  /** Smallest face side length to detect (in detection-image pixels). */
  minSize: number;
  /** Largest face side length to detect (in detection-image pixels). */
  maxSize: number;
  /** Multiplier between successive window scales. */
  scaleFactor: number;
}

/** Accumulates detections across frames for temporal smoothing. */
export type UpdateMemory = (findings: Finding[]) => Finding[];

/** A single face detection result, in detection-image coordinates. */
export interface Finding {
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
  for (let idx = 0; idx < 4; ++idx) view.setUint8(idx, bytes[pos + idx]);
  const treeDepth = view.getInt32(0, true);
  pos += 4;
  for (let idx = 0; idx < 4; ++idx) view.setUint8(idx, bytes[pos + idx]);
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
      for (let idx = 0; idx < 4; ++idx) view.setUint8(idx, bytes[pos + idx]);
      predictionList.push(view.getFloat32(0, true));
      pos += 4;
    }
    for (let idx = 0; idx < 4; ++idx) view.setUint8(idx, bytes[pos + idx]);
    thresholdList.push(view.getFloat32(0, true));
    pos += 4;
  }
  const codes = new Int8Array(codeList);
  const predictions = new Float32Array(predictionList);
  const thresholds = new Float32Array(thresholdList);

  return (row, col, scale, pixels, width) => {
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
            ((row + codes[root + 4 * idx] * scale) >> 8) * width + ((col + codes[root + 4 * idx + 1] * scale) >> 8)
          ] <=
          pixels[
            ((row + codes[root + 4 * idx + 2] * scale) >> 8) * width + ((col + codes[root + 4 * idx + 3] * scale) >> 8)
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

export function runCascade(image: PicoImage, classifyRegion: ClassifyRegion, params: CascadeParams): Finding[] {
  const { pixels, height, width } = image;
  const { shiftFactor, minSize, maxSize, scaleFactor } = params;
  let scale = minSize;
  const findings: Finding[] = [];
  while (scale <= maxSize) {
    const step = Math.max(shiftFactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;
    for (let row = offset; row <= height - offset; row += step) {
      for (let col = offset; col <= width - offset; col += step) {
        const score = classifyRegion(row, col, scale, pixels, width);
        if (score > 0.0) {
          findings.push({ row, col, size: scale, score });
        }
      }
    }
    scale = scale * scaleFactor;
  }
  return findings;
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

/**
 * Overlap ratio (IoU) for two square pico detections.
 * Both are represented as (row, col, size) where size is the square side length.
 * @returns number - Ratio in [0, 1] — 0 (none) to 1 (identical).
 */
function getOverlap(findingA: Finding, findingB: Finding): number {
  const overRow = Math.max(
    0,
    Math.min(findingA.row + findingA.size / 2, findingB.row + findingB.size / 2) -
      Math.max(findingA.row - findingA.size / 2, findingB.row - findingB.size / 2),
  );
  const overCol = Math.max(
    0,
    Math.min(findingA.col + findingA.size / 2, findingB.col + findingB.size / 2) -
      Math.max(findingA.col - findingA.size / 2, findingB.col - findingB.size / 2),
  );
  return (overRow * overCol) / (findingA.size * findingA.size + findingB.size * findingB.size - overRow * overCol);
}

export function clusterDetections(findings: Finding[], minOverlap: number): Finding[] {
  findings = findings.sort((findingA, findingB) => findingB.score - findingA.score);
  const assignments = new Array(findings.length).fill(0);
  const clusters: Finding[] = [];
  for (let idx = 0; idx < findings.length; ++idx) {
    if (assignments[idx] === 0) {
      let rowSum = 0,
        colSum = 0,
        sizeSum = 0,
        scoreSum = 0,
        count = 0;
      for (let jdx = idx; jdx < findings.length; ++jdx) {
        if (getOverlap(findings[idx], findings[jdx]) > minOverlap) {
          assignments[jdx] = 1;
          rowSum += findings[jdx].row;
          colSum += findings[jdx].col;
          sizeSum += findings[jdx].size;
          scoreSum += findings[jdx].score;
          count += 1;
        }
      }
      const meanScore = CLUSTER_Q_MODE === "mean" ? scoreSum / count : scoreSum;
      clusters.push({ row: rowSum / count, col: colSum / count, size: sizeSum / count, score: meanScore });
    }
  }
  return clusters;
}

export function instantiateDetectionMemory(size: number): UpdateMemory {
  let slot = 0;
  const memory: Finding[][] = [];
  for (let idx = 0; idx < size; idx++) memory.push([]);

  return (findings) => {
    memory[slot] = findings.slice();
    slot = (slot + 1) % size;
    const all: Finding[] = [];
    for (let idx = 0; idx < size; idx++) for (let jdx = 0; jdx < memory[idx].length; jdx++) all.push(memory[idx][jdx]);
    return all;
  };
}

/**
 * Renders the grayscale pixel data from a `PicoImage` onto a canvas.
 */
export function renderPicoImage(img: PicoImage, canvas: HTMLCanvasElement): void {
  const { pixels, height, width } = img;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let idx = 0; idx < height * width; idx++) {
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
  return { pixels, height, width };
}
