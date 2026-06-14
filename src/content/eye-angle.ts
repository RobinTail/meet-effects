import type { FaceBox } from "../shared/types";

/**
 * Computed eye positions and orientation in canvas-pixel space, ready for
 * rendering. All coordinates account for scaling and (optionally) horizontal mirroring.
 */
export interface EyeInfo {
  /** Canvas-x of the left eye center. */
  cx: number;
  /** Canvas-y of the left eye center. */
  cy: number;
  /** Canvas-x of the right eye center. */
  cx2: number;
  /** Canvas-y of the right eye center. */
  cy2: number;
  /** Midpoint x between the two eyes. */
  midX: number;
  /** Midpoint y between the two eyes. */
  midY: number;
  /** Angle of the eye baseline relative to the horizontal axis, in radians. */
  angle: number;
  /** Half the Euclidean distance between the two eye centers. */
  halfDist: number;
}

/**
 * Derive eye positions, midpoint, angle, and half-distance from a detected face, transforming landmark coordinates
 * into canvas-pixel space. Left/right assignments follow the source image's orientation (the detector's own left/right
 * labels). When {@code mirrored} is true the x-coordinates are flipped so the rendering matches a mirrored video feed.
 *
 * @param box      Face detection result containing eye landmark coordinates in source-video pixels.
 * @param canvasW  Width of the output canvas, used for x-flipping when {@code mirrored} is true.
 * @param scaleX   Horizontal scale factor from source-video space to canvas space ( {@code canvasWidth / videoWidth}).
 * @param scaleY   Vertical scale factor from source-video space to canvas space ( {@code canvasHeight / videoHeight}).
 * @param mirrored Whether the canvas is horizontally mirrored (selfie mode).
 *                 When true, x-coordinates are reflected and the eye angle is negated.
 * @returns Computed eye info, or {@code undefined} if any eye landmark is missing.
 */
export function getEyeInfo(
  box: FaceBox,
  canvasW: number,
  scaleX: number,
  scaleY: number,
  mirrored: boolean,
): EyeInfo | undefined {
  if (box.eyeLX === undefined || box.eyeLY === undefined || box.eyeRX === undefined || box.eyeRY === undefined) return;

  const lx = box.eyeLX * scaleX;
  const ly = box.eyeLY * scaleY;
  const rx = box.eyeRX * scaleX;
  const ry = box.eyeRY * scaleY;

  const faceAngle = Math.atan2(ry - ly, rx - lx);
  const angle = mirrored ? -faceAngle : faceAngle;

  const cx = mirrored ? canvasW - lx : lx;
  const cy = ly;
  const cx2 = mirrored ? canvasW - rx : rx;
  const cy2 = ry;

  const midX = (cx + cx2) / 2;
  const midY = (cy + cy2) / 2;
  const halfDist = Math.hypot(cx2 - cx, cy2 - cy) / 2;

  return { cx, cy, cx2, cy2, midX, midY, angle, halfDist };
}
