import type { FaceBox } from "../shared/types";

export interface EyeInfo {
  cx: number;
  cy: number;
  cx2: number;
  cy2: number;
  midX: number;
  midY: number;
  angle: number;
  halfDist: number;
}

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
