import type { FaceBox } from "../shared/types";
import { getEyeInfo } from "./eye-angle";

export function renderDebugBox(
  ctx: CanvasRenderingContext2D,
  box: FaceBox,
  canvasW: number,
  scaleX: number,
  scaleY: number,
  mirrored: boolean,
) {
  const dx = mirrored ? canvasW - (box.x + box.width) * scaleX : box.x * scaleX;

  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(dx, box.y * scaleY, box.width * scaleX, box.height * scaleY);
  ctx.setLineDash([]);

  const eyes = getEyeInfo(box, canvasW, scaleX, scaleY, mirrored);
  if (!eyes) return;

  const { cx, cy, cx2, cy2, halfDist, angle } = eyes;
  const eyeR = Math.max(2, halfDist * 0.25);

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
  ctx.arc(cx, cy, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx2, cy2, eyeR, 0, Math.PI * 2);
  ctx.fill();
}
