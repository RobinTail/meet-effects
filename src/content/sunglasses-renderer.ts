import type { FaceBox } from "../shared/types";
import { getEyeInfo } from "./eye-angle";

export function renderSunglasses(
  ctx: CanvasRenderingContext2D,
  box: FaceBox,
  canvasW: number,
  scaleX: number,
  scaleY: number,
  mirrored: boolean,
  sunglassesSize: number,
) {
  const { midX, midY, angle, halfDist } = getEyeInfo(box, canvasW, scaleX, scaleY, mirrored);

  const lensW = box.width * sunglassesSize * 0.5 * scaleX;
  const lensH = lensW * 0.5;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = Math.max(2, lensW * 0.08);
  ctx.fillStyle = "rgba(30, 30, 30, 0.7)";

  ctx.beginPath();
  ctx.roundRect(-halfDist - lensW / 2, -lensH / 2, lensW, lensH, lensW * 0.2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(halfDist - lensW / 2, -lensH / 2, lensW, lensH, lensW * 0.2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#222";
  ctx.lineWidth = Math.max(1, lensW * 0.06);
  ctx.beginPath();
  ctx.moveTo(-halfDist + lensW / 2, 0);
  ctx.lineTo(halfDist - lensW / 2, 0);
  ctx.stroke();

  ctx.restore();
}
