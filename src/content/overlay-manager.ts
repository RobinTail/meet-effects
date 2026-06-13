import type { OverlayState } from "../shared/types";

export class OverlayManager {
  private states = new Map<HTMLVideoElement, OverlayState>();
  private resizeObserver: ResizeObserver;

  constructor() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const state = this.findState(entry.target);
        if (state) this.syncCanvasSize(state);
      }
    });
  }

  attach(video: HTMLVideoElement): OverlayState {
    if (this.states.has(video)) return this.states.get(video)!;

    const canvas = document.createElement("canvas");
    canvas.className = "mc-overlay-canvas";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";

    const parent = video.parentNode;
    if (!parent) throw new Error("Video has no parent node");

    const parentEl = parent as HTMLElement;
    const pos = getComputedStyle(parentEl).position;
    if (pos === "static") {
      parentEl.style.position = "relative";
    }

    parent.insertBefore(canvas, video.nextSibling);

    const ctx = canvas.getContext("2d")!;
    const state: OverlayState = {
      video,
      canvas,
      ctx,
      animationId: null,
      face: null,
      mirrored: false,
    };

    this.resizeObserver.observe(video);
    this.states.set(video, state);

    requestAnimationFrame(() => this.syncCanvasSize(state));

    return state;
  }

  detach(video: HTMLVideoElement) {
    const state = this.states.get(video);
    if (!state) return;

    this.resizeObserver.unobserve(state.video);

    if (state.animationId !== null) {
      cancelAnimationFrame(state.animationId);
    }

    state.canvas.remove();
    this.states.delete(video);
  }

  getState(video: HTMLVideoElement): OverlayState | undefined {
    return this.states.get(video);
  }

  getAllStates(): OverlayState[] {
    return Array.from(this.states.values());
  }

  private findState(element: Element): OverlayState | undefined {
    for (const state of this.states.values()) {
      if (state.video === element) return state;
    }
    return;
  }

  private syncCanvasSize(state: OverlayState) {
    const { video, canvas, ctx } = state;
    const transform = getComputedStyle(video).transform;
    state.mirrored = transform.includes("matrix(-1,") || transform.includes("scaleX(-1)");
    const rect = video.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      requestAnimationFrame(() => this.syncCanvasSize(state));
      return;
    }
    const width = rect.width;
    const height = rect.height;
    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  destroy() {
    this.resizeObserver.disconnect();
    for (const [video] of this.states) {
      this.detach(video);
    }
  }
}
