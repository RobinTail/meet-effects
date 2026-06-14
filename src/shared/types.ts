/** Overlay feature that can be enabled or disabled by the user. */
export type Feature = "nose" | "curtains" | "sunglasses" | "crown";

export interface FeatureSettings {
  enabled: boolean;
  size: number;
}

/** Persisted user preferences, synced via chrome.storage.sync. */
export interface Settings {
  /** Whether the extension is active. */
  enabled: boolean;
  /** Per-feature settings; absent feature = disabled. */
  overlays: Partial<Record<Feature, FeatureSettings>>;
  /** Target detection rate in frames per second. */
  fps: number;
  /** Show debug overlays (bounding box, console logs, pico grayscale canvas). */
  debug: boolean;
}

/** Factory defaults for {@link Settings}. */
export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  overlays: {
    sunglasses: { enabled: true, size: 0.6 },
    crown: { enabled: true, size: 0.5 },
  },
  fps: 15,
  debug: false,
};

/** Axis-aligned bounding box of a detected face, plus optional landmarks. */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Exact nose-tip x-coordinate (from native landmark detector). */
  noseX?: number;
  /** Exact nose-tip y-coordinate (from native landmark detector). */
  noseY?: number;
  /** Left eye center x-coordinate (from native landmark detector). */
  eyeLX?: number;
  /** Left eye center y-coordinate (from native landmark detector). */
  eyeLY?: number;
  /** Right eye center x-coordinate (from native landmark detector). */
  eyeRX?: number;
  /** Right eye center y-coordinate (from native landmark detector). */
  eyeRY?: number;
  /** Mouth center x-coordinate (from native landmark detector). */
  mouthX?: number;
  /** Mouth center y-coordinate (from native landmark detector). */
  mouthY?: number;
}

/** Runtime state the detection loop and renderers share for a single video element. */
export interface OverlayState {
  /** The <video> element being observed. */
  video: HTMLVideoElement;
  /** Canvas drawn on top of the video (or the Meet tile). */
  canvas: HTMLCanvasElement;
  /** 2D context of {@link canvas}. */
  ctx: CanvasRenderingContext2D;
  /** Current requestAnimationFrame handle, if any. */
  animationId: number | null;
  /** Most recently detected face, or null when no face is tracked. */
  face: FaceBox | null;
  /** Whether the canvas should mirror the video horizontally (selfie mode). */
  mirrored: boolean;
  /** Optional canvas to render the grayscale image pico sees (for debugging). */
  debugCanvas?: HTMLCanvasElement;
}

export interface RenderParams {
  ctx: CanvasRenderingContext2D;
  box: FaceBox | null;
  canvasW: number;
  canvasH: number;
  mirrored: boolean;
  scaleX: number;
  scaleY: number;
  size?: number;
}

export type FeatureRenderer = (params: RenderParams) => void;
