import type { FaceBox } from "../shared/types";

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
}
