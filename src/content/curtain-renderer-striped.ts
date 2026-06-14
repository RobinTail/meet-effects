import type { FeatureRenderer } from "../shared/types";

const STRIPE_RED = "#cc0000";
const STRIPE_WHITE = "#f0eee8";
const FOLD_SHADOW = "rgba(0,0,0,0.12)";

const SIDE_WIDTH_FRACTION = 0.1;
const SIDE_WIDTH_MIN = 40;
const SIDE_WIDTH_MAX = 140;
const TOP_HEIGHT_FRACTION = 0.08;
const TOP_HEIGHT_MIN = 24;
const TOP_HEIGHT_MAX = 80;

const N_STRIPES = 7;
const FOLD_SHADOW_FRACTION = 0.25;
const SCALLOP_RADIUS = 10;

function clamp(val: number, lo: number, hi: number): number {
  return val < lo ? lo : val > hi ? hi : val;
}

function drawScallopClip(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);

  const scallopW = SCALLOP_RADIUS * 2;
  const count = Math.ceil(width / scallopW);
  for (let idx = count - 1; idx >= 0; idx--) {
    const cx = x + idx * scallopW + SCALLOP_RADIUS;
    ctx.arc(cx, y + height, SCALLOP_RADIUS, 0, Math.PI, false);
  }

  ctx.closePath();
}

function drawSideCurtain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  mirror: boolean,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  const stripeW = width / N_STRIPES;
  const shadowW = stripeW * FOLD_SHADOW_FRACTION;

  for (let idx = 0; idx < N_STRIPES; idx++) {
    const sx = x + idx * stripeW;
    ctx.fillStyle = idx % 2 === 0 ? STRIPE_RED : STRIPE_WHITE;
    ctx.fillRect(sx, y, stripeW, height);
    ctx.fillStyle = FOLD_SHADOW;
    if (mirror) ctx.fillRect(sx, y, shadowW, height);
    else ctx.fillRect(sx + stripeW - shadowW, y, shadowW, height);
  }

  ctx.restore();
}

function drawTopValance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  sideWidth: number,
) {
  const innerX = x + sideWidth;
  const innerW = width - sideWidth * 2;

  ctx.save();
  drawScallopClip(ctx, innerX, y, innerW, height);
  ctx.clip();

  const stripeW = innerW / N_STRIPES;
  const shadowW = stripeW * FOLD_SHADOW_FRACTION;

  for (let idx = 0; idx < N_STRIPES; idx++) {
    const sx = innerX + idx * stripeW;
    ctx.fillStyle = idx % 2 === 0 ? STRIPE_RED : STRIPE_WHITE;
    ctx.fillRect(sx, y, stripeW, height);
    ctx.fillStyle = FOLD_SHADOW;
    ctx.fillRect(sx + stripeW - shadowW, y, shadowW, height);
  }

  ctx.restore();
}

export const renderStripedCurtains: FeatureRenderer = ({ ctx, canvasW, canvasH }) => {
  const sideWidth = clamp(Math.round(canvasW * SIDE_WIDTH_FRACTION), SIDE_WIDTH_MIN, SIDE_WIDTH_MAX);
  const topHeight = clamp(Math.round(canvasH * TOP_HEIGHT_FRACTION), TOP_HEIGHT_MIN, TOP_HEIGHT_MAX);

  drawTopValance(ctx, 0, 0, canvasW, topHeight, sideWidth);
  drawSideCurtain(ctx, 0, 0, sideWidth, canvasH, false);
  drawSideCurtain(ctx, canvasW - sideWidth, 0, sideWidth, canvasH, true);
};
