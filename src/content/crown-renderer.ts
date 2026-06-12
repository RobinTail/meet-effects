import type { FaceBox } from "../shared/types";
import { getEyeInfo } from "./eye-angle";

const PEAK_X = [0, 0.5, 1];
const PEAK_Y = [-0.5, -0.5, -0.5];
const VALLEY_X = [0.25, 0.75];
const VALLEY_Y = [0, 0];
const JEWEL_X = [0.2, 0.5, 0.8];
const JEWEL_Y = [0.5, 0.4, 0.5];
const JEWEL_R = [0.028, 0.035, 0.028];
const TILT_SHIFT = 2;

export function renderCrown(
  ctx: CanvasRenderingContext2D,
  box: FaceBox,
  w: number,
  scaleX: number,
  scaleY: number,
  mirrored: boolean,
  crownSize: number,
) {
  const cx = mirrored ? w - (box.x + box.width / 2) * scaleX : (box.x + box.width / 2) * scaleX;
  const topY = box.y * scaleY;
  const cw = box.width * scaleX;
  const ch = box.height * crownSize * scaleY;

  const { angle } = getEyeInfo(box, w, scaleX, scaleY, mirrored);

  ctx.save();

  ctx.translate(cx, topY - ch / 2);
  ctx.rotate(angle);
  ctx.translate(Math.sin(angle) * ch * TILT_SHIFT, 0);
  ctx.translate(-cx, -(topY - ch / 2));

  const left = cx - cw / 2;
  const right = cx + cw / 2;
  const bottom = topY;
  const top = topY - ch;
  const bandH = ch * 0.25;

  ctx.fillStyle = ctx.createLinearGradient(cx, top, cx, bottom);
  ctx.fillStyle.addColorStop(0, "#FFD700");
  ctx.fillStyle.addColorStop(1, "#FFA500");
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = Math.max(1.5, cw * 0.01);

  ctx.beginPath();
  ctx.moveTo(left, bottom);

  // left side up
  ctx.lineTo(left, bottom - bandH);
  ctx.lineTo(left + PEAK_X[0] * cw, top + ch * PEAK_Y[0]);
  // down to valley
  ctx.lineTo(left + VALLEY_X[0] * cw, top + ch * VALLEY_Y[0]);
  // up to center peak
  ctx.lineTo(left + PEAK_X[1] * cw, top + ch * PEAK_Y[1]);
  // down to valley
  ctx.lineTo(left + VALLEY_X[1] * cw, top + ch * VALLEY_Y[1]);
  // up to right peak
  ctx.lineTo(left + PEAK_X[2] * cw, top + ch * PEAK_Y[2]);
  // right side down
  ctx.lineTo(right, bottom - bandH);
  ctx.lineTo(right, bottom);

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // band
  const by = bottom - bandH;
  ctx.fillStyle = "#DAA520";
  ctx.fillRect(left, by, cw, bandH);

  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, by);
  ctx.lineTo(right, by);
  ctx.stroke();

  // jewels
  for (let i = 0; i < JEWEL_X.length; i++) {
    const px = left + JEWEL_X[i] * cw;
    const py = top + ch * JEWEL_Y[i];
    const r = cw * JEWEL_R[i];

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = "#FF0044";
    ctx.fill();
    ctx.strokeStyle = "#FF69B4";
    ctx.lineWidth = Math.max(1, r * 0.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px - r * 0.25, py - r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();
  }

  ctx.restore();
}
