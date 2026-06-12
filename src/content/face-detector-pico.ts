import {
  unpackCascade,
  runCascade,
  grayscale,
  renderPicoImage,
  clusterDetections,
  instantiateDetectionMemory,
} from "./pico";
import type { PicoDet } from "./pico";
import type { Detector } from "./detector";
import type { FaceBox } from "../shared/types";

// number of frames to accumulate raw detections for temporal smoothing (pico's detection memory)
const MEMORY_SIZE = 5;
// minimum average per-detection score to acquire a face; higher = fewer false positives
const ACQUIRE_SCORE = 1.2;
// once acquired, keep the face while average score stays above this (hysteresis)
const HOLD_SCORE = 0.5;
// detections with IoU above this are merged into the same cluster during non-max suppression
const CLUSTER_IOU_THRESHOLD = 0.2;
// longest dimension (px) of the downscaled detection image fed to pico; smaller = faster but less accurate
const DETECT_MAX_DIM = 320;
// pico sliding-window params — see https://nenadmarkus.com/p/picojs-intro/
const SHIFT_FACTOR = 0.1; // window moves by this fraction of its size each step
const MIN_FACE_SIZE = 40; // smallest face to detect (in detection-image pixels)
const SCALE_FACTOR = 1.1; // multiplier between successive window scales

let sharedClassifyRegion: ((r: number, c: number, s: number, pixels: Int8Array, ldim: number) => number) | null = null;
let cascadeLoaded = false;
let cascadeError: string | null = null;

async function loadCascade(): Promise<boolean> {
  if (cascadeLoaded) return true;
  if (cascadeError) return false;

  try {
    const response = await fetch(CASCADE_URL);
    if (!response.ok) {
      cascadeError = `HTTP ${response.status}`;
      return false;
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Int8Array(buffer);
    sharedClassifyRegion = unpackCascade(bytes);
    cascadeLoaded = true;
    return true;
  } catch (e) {
    cascadeError = String(e);
    console.error(`${APP_TITLE}: failed to load cascade`, e);
    return false;
  }
}

async function runPicoDetection(
  video: HTMLVideoElement,
  debugCanvas?: HTMLCanvasElement,
): Promise<{ dets: PicoDet[]; dimScale: number } | null> {
  if (!sharedClassifyRegion) {
    const loaded = await loadCascade();
    if (!loaded) return null;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const dimScale = vw > vh ? Math.min(1, DETECT_MAX_DIM / vw) : Math.min(1, DETECT_MAX_DIM / vh);
  const pw = Math.round(vw * dimScale);
  const ph = Math.round(vh * dimScale);

  const offscreen = document.createElement("canvas");
  offscreen.width = pw;
  offscreen.height = ph;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(video, 0, 0, pw, ph);

  const imgData = ctx.getImageData(0, 0, pw, ph);
  const picoImg = grayscale(imgData, pw, ph);
  if (debugCanvas) renderPicoImage(picoImg, debugCanvas);

  const dets = runCascade(picoImg, sharedClassifyRegion!, {
    shiftfactor: SHIFT_FACTOR,
    minsize: MIN_FACE_SIZE,
    maxsize: Math.max(pw, ph),
    scalefactor: SCALE_FACTOR,
  });

  return { dets, dimScale };
}

export class PicoDetector implements Detector {
  readonly name = "pico";
  private updateMemory: (dets: PicoDet[]) => PicoDet[];

  constructor() {
    this.updateMemory = instantiateDetectionMemory(MEMORY_SIZE);
  }

  async init(): Promise<boolean> {
    return loadCascade();
  }

  async detect(
    video: HTMLVideoElement,
    debugCanvas?: HTMLCanvasElement,
    currentlyHasFace?: boolean,
  ): Promise<FaceBox | null> {
    const raw = await runPicoDetection(video, debugCanvas);
    if (!raw) return null;

    const { dets, dimScale } = raw;
    const accumulated = this.updateMemory(dets);
    const clustered = clusterDetections(accumulated, CLUSTER_IOU_THRESHOLD);
    const threshold = currentlyHasFace ? HOLD_SCORE : ACQUIRE_SCORE;
    const best = clustered.find((d) => d.q >= threshold);
    if (!best) return null;

    const invScale = 1 / dimScale;
    return {
      x: (best.c - best.s / 2) * invScale,
      y: (best.r - best.s / 2) * invScale,
      width: best.s * invScale,
      height: best.s * invScale,
    };
  }
}
