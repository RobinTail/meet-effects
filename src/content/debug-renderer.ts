import type { FeatureRenderer } from "../shared/types";
import { getEyeInfo } from "./eye-angle";

const EYE_RADIUS = 4;

export const renderDebugBox: FeatureRenderer = ({ ctx, box, canvasW, scaleX, scaleY, mirrored }) => {
  if (!box) return;
  const dx = mirrored ? canvasW - (box.x + box.width) * scaleX : box.x * scaleX;

  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(dx, box.y * scaleY, box.width * scaleX, box.height * scaleY);
  ctx.setLineDash([]);

  if (box.mouthX !== undefined && box.mouthY !== undefined) {
    const mx = mirrored ? canvasW - box.mouthX * scaleX : box.mouthX * scaleX;
    const my = box.mouthY * scaleY;
    ctx.fillStyle = "#ff69b4";
    ctx.beginPath();
    ctx.ellipse(mx, my, box.width * scaleX * 0.06, box.height * scaleY * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const eyes = getEyeInfo(box, canvasW, scaleX, scaleY, mirrored);
  if (!eyes) return;

  const { cx, cy, cx2, cy2, angle } = eyes;
  const boxLeft = dx;
  const boxRight = dx + box.width * scaleX;
  const slope = Math.tan(angle);
  const eyeLineY1 = cy + slope * (boxLeft - cx);
  const eyeLineY2 = cy + slope * (boxRight - cx);
  ctx.strokeStyle = "#ffdd44";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(boxLeft, eyeLineY1);
  ctx.lineTo(boxRight, eyeLineY2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ffdd44";
  ctx.beginPath();
  ctx.arc(cx, cy, EYE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx2, cy2, EYE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
};
