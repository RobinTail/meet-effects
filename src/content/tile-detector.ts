import type { OverlayState } from "../shared/types";
import { OverlayManager } from "./overlay-manager";

const VIDEO_SELECTORS = ['video[src*="blob:"]', "video[autoplay]"];

const CONTAINER_OBSERVER_SELECTORS = ["[data-participant-id]", '[role="presentation"]', "[jsname]"];

export class TileDetector {
  private tiles = new Map<HTMLVideoElement, OverlayState>();
  private overlay = new OverlayManager();
  private observer: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private onChange: (tiles: OverlayState[]) => void;

  constructor(onChange: (tiles: OverlayState[]) => void) {
    this.onChange = onChange;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.initialScan();
    this.startObserver();
    this.startPolling();
  }

  stop() {
    this.running = false;
    this.observer?.disconnect();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.overlay.destroy();
    this.tiles.clear();
  }

  private initialScan() {
    for (const video of this.findVideos()) {
      this.addTile(video);
    }
    this.emit();
  }

  private findVideos(): HTMLVideoElement[] {
    return Array.from(document.querySelectorAll<HTMLVideoElement>(VIDEO_SELECTORS.join(",")));
  }

  private addTile(video: HTMLVideoElement) {
    if (this.tiles.has(video)) return;

    const state = this.overlay.attach(video);
    this.tiles.set(video, state);
    console.log(`${APP_TITLE}: tile added`, video);
  }

  private removeTile(video: HTMLVideoElement) {
    if (!this.tiles.has(video)) return;

    this.overlay.detach(video);
    this.tiles.delete(video);
    console.log(`${APP_TITLE}: tile removed`, video);
  }

  private syncTiles() {
    const live = new Set(this.findVideos());

    for (const [video] of this.tiles) {
      if (!live.has(video) || !document.contains(video)) {
        this.removeTile(video);
      }
    }

    for (const video of live) {
      if (!this.tiles.has(video)) {
        this.addTile(video);
      }
    }

    this.emit();
  }

  private startObserver() {
    const target = this.findObserverTarget();
    if (!target) return;

    this.observer = new MutationObserver(() => this.syncTiles());
    this.observer.observe(target, { childList: true, subtree: true });
  }

  private findObserverTarget(): Element | null {
    for (const sel of CONTAINER_OBSERVER_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el.closest("div") ?? el;
    }
    return document.body;
  }

  private startPolling() {
    this.pollTimer = setInterval(() => this.syncTiles(), 2000);
  }

  private emit() {
    this.onChange(Array.from(this.tiles.values()));
  }
}
