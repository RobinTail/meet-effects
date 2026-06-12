import type { FaceBox } from "../shared/types";

const EYE_CX = 0.3;
const EYE_CY = 0.35;
const EYE_SPACING = 0.4;

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

export function getEyeInfo(box: FaceBox, w: number, scaleX: number, scaleY: number, mirrored: boolean): EyeInfo {
  const eyeLX = box.eyeLX ?? box.x + box.width * EYE_CX;
  const eyeLY = box.eyeLY ?? box.y + box.height * EYE_CY;
  const eyeRX = box.eyeRX ?? box.x + box.width * (EYE_CX + EYE_SPACING);
  const eyeRY = box.eyeRY ?? box.y + box.height * EYE_CY;

  const lx = eyeLX * scaleX;
  const ly = eyeLY * scaleY;
  const rx = eyeRX * scaleX;
  const ry = eyeRY * scaleY;

  const faceAngle = Math.atan2(ry - ly, rx - lx);
  const angle = mirrored ? -faceAngle : faceAngle;

  const cx = mirrored ? w - lx : lx;
  const cy = ly;
  const cx2 = mirrored ? w - rx : rx;
  const cy2 = ry;

  const midX = (cx + cx2) / 2;
  const midY = (cy + cy2) / 2;
  const halfDist = Math.hypot(cx2 - cx, cy2 - cy) / 2;

  return { cx, cy, cx2, cy2, midX, midY, angle, halfDist };
}
