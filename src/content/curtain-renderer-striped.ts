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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function drawScallopClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);

  const sw = SCALLOP_RADIUS * 2;
  const n = Math.ceil(w / sw);
  for (let i = n - 1; i >= 0; i--) {
    const cx = x + i * sw + SCALLOP_RADIUS;
    ctx.arc(cx, y + h, SCALLOP_RADIUS, 0, Math.PI, false);
  }

  ctx.closePath();
}

function drawSideCurtain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mirror: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const stripeW = w / N_STRIPES;
  const shadowW = stripeW * FOLD_SHADOW_FRACTION;

  for (let i = 0; i < N_STRIPES; i++) {
    const sx = x + i * stripeW;
    const color = i % 2 === 0 ? STRIPE_RED : STRIPE_WHITE;
    ctx.fillStyle = color;
    ctx.fillRect(sx, y, stripeW, h);

    ctx.fillStyle = FOLD_SHADOW;
    if (mirror) {
      ctx.fillRect(sx, y, shadowW, h);
    } else {
      ctx.fillRect(sx + stripeW - shadowW, y, shadowW, h);
    }
  }

  ctx.restore();
}

function drawTopValance(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sideW: number) {
  const innerX = x + sideW;
  const innerW = w - sideW * 2;

  ctx.save();
  drawScallopClip(ctx, innerX, y, innerW, h);
  ctx.clip();

  const stripeW = innerW / N_STRIPES;
  const shadowW = stripeW * FOLD_SHADOW_FRACTION;

  for (let i = 0; i < N_STRIPES; i++) {
    const sx = innerX + i * stripeW;
    const color = i % 2 === 0 ? STRIPE_RED : STRIPE_WHITE;
    ctx.fillStyle = color;
    ctx.fillRect(sx, y, stripeW, h);

    ctx.fillStyle = FOLD_SHADOW;
    ctx.fillRect(sx + stripeW - shadowW, y, shadowW, h);
  }

  ctx.restore();
}

export function renderStripedCurtains(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sideW = clamp(Math.round(w * SIDE_WIDTH_FRACTION), SIDE_WIDTH_MIN, SIDE_WIDTH_MAX);
  const topH = clamp(Math.round(h * TOP_HEIGHT_FRACTION), TOP_HEIGHT_MIN, TOP_HEIGHT_MAX);

  drawTopValance(ctx, 0, 0, w, topH, sideW);
  drawSideCurtain(ctx, 0, 0, sideW, h, false);
  drawSideCurtain(ctx, w - sideW, 0, sideW, h, true);
}
