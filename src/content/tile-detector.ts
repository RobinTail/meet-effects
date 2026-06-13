import type { OverlayState } from "../shared/types";
import { OverlayManager } from "./overlay-manager";

const VIDEO_SELECTORS = ['video[src*="blob:"]', "video[autoplay]"];

const CONTAINER_OBSERVER_SELECTORS = ["[data-participant-id]", '[role="presentation"]', "[jsname]"];

export class TileDetector {
  private videos = new Set<HTMLVideoElement>();
  private overlay = new OverlayManager();
  private observer: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(private readonly onChange: (tiles: OverlayState[]) => void) {}

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initialScan();
    this.startObserver();
    this.startPolling();
  }

  stop() {
    this.isRunning = false;
    this.observer?.disconnect();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.overlay.destroy();
    this.videos.clear();
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
    if (this.videos.has(video)) return;

    this.overlay.attach(video);
    this.videos.add(video);
    console.log(`${APP_TITLE}: tile added`, video);
  }

  private removeTile(video: HTMLVideoElement) {
    if (!this.videos.has(video)) return;

    this.overlay.detach(video);
    this.videos.delete(video);
    console.log(`${APP_TITLE}: tile removed`, video);
  }

  private syncTiles() {
    const live = new Set(this.findVideos());

    for (const video of this.videos) {
      if (!live.has(video) || !document.contains(video)) {
        this.removeTile(video);
      }
    }

    for (const video of live) {
      if (!this.videos.has(video)) {
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
    const tiles: OverlayState[] = [];
    for (const video of this.videos) {
      const state = this.overlay.getState(video);
      if (state) tiles.push(state);
    }
    this.onChange(tiles);
  }
}
