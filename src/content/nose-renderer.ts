import type { FaceBox } from "../shared/types";

const NOSE_CX = 0.5;
const NOSE_CY = 0.6;

export function renderNose(
  ctx: CanvasRenderingContext2D,
  box: FaceBox,
  w: number,
  scaleX: number,
  scaleY: number,
  mirrored: boolean,
  noseSize: number,
) {
  const noseX = box.noseX != null ? box.noseX : box.x + box.width * NOSE_CX;
  const noseY = box.noseY != null ? box.noseY : box.y + box.height * NOSE_CY;
  const x = noseX * scaleX;
  const y = noseY * scaleY;
  const cx = mirrored ? w - x : x;
  const cy = y;
  const noseRadius = box.height * noseSize * scaleY;

  // 3D ball gradient — light from upper-left
  const grad = ctx.createRadialGradient(
    cx - noseRadius * 0.3, // focal point shifted upper-left
    cy - noseRadius * 0.3,
    0,
    cx,
    cy,
    noseRadius,
  );
  grad.addColorStop(0, "#ff6666");
  grad.addColorStop(0.4, "#ff0000");
  grad.addColorStop(0.85, "#AA0000");
  grad.addColorStop(1, "#990000");

  ctx.beginPath();
  ctx.arc(cx, cy, noseRadius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // specular highlight (top-left)
  const hlw = noseRadius * 0.35;
  const hlh = noseRadius * 0.45;
  ctx.beginPath();
  ctx.ellipse(cx - noseRadius * 0.25, cy - noseRadius * 0.3, hlw, hlh, 0.9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fill();
}
