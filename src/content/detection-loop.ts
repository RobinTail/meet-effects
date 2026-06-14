import type { Feature, FeatureRenderer, OverlayState, Settings } from "../shared/types";
import type { Detector } from "./detector";
import { NativeDetector } from "./face-detector-native";
import { PicoDetector } from "./face-detector-pico";
import { renderStripedCurtains } from "./curtain-renderer-striped";
import { renderNose } from "./nose-renderer";
import { renderSunglasses } from "./sunglasses-renderer";
import { renderCrown } from "./crown-renderer";
import { renderDebugBox } from "./debug-renderer";
import { DEFAULT_SETTINGS } from "../shared/types";

const RENDERERS: Record<Feature, FeatureRenderer> = {
  curtains: renderStripedCurtains,
  crown: renderCrown,
  sunglasses: renderSunglasses,
  nose: renderNose,
};

export class DetectionLoop {
  private readonly state: OverlayState;
  private running = false;
  private lastDetection = 0;
  private minInterval: number;
  private animationId: number | null = null;
  private detector: Detector;
  private readonly settings: Settings;

  private get canvasSize() {
    const { canvas } = this.state;
    const canvasW = parseFloat(canvas.style.width) || canvas.width / devicePixelRatio;
    const canvasH = parseFloat(canvas.style.height) || canvas.height / devicePixelRatio;
    const scaleX = canvasW / this.state.video.videoWidth;
    const scaleY = canvasH / this.state.video.videoHeight;
    return { canvasW, canvasH, scaleX, scaleY };
  }

  get detectorName(): string {
    return this.detector.name;
  }

  constructor(state: OverlayState, settings?: Partial<Settings>) {
    this.state = state;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.minInterval = 1000 / this.settings.fps;
    this.detector = this.pickDetector();
  }

  private pickDetector(): Detector {
    if (NativeDetector.isSupported()) return new NativeDetector();
    return new PicoDetector();
  }

  applySettings(partial: Partial<Settings>) {
    Object.assign(this.settings, partial);
    this.minInterval = 1000 / this.settings.fps;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.detector.init().then((ok) => {
      if (this.settings.debug) console.log(`${APP_TITLE}: detector init =`, ok, `(${this.detector.name})`);
    });
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearCanvas();
    this.state.face = null;
  }

  private clearCanvas() {
    const { canvasW, canvasH } = this.canvasSize;
    this.state.ctx.clearRect(0, 0, canvasW, canvasH);
  }

  private schedule() {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(() => this.tick());
  }

  private async tick() {
    if (!this.running) return;

    const video = this.state.video;
    if (video.paused || video.ended || video.readyState < 2) {
      this.schedule();
      return;
    }

    const now = Date.now();
    if (now - this.lastDetection >= this.minInterval) {
      this.lastDetection = now;
      await this.detect();
    }

    this.render();
    this.schedule();
  }

  private async detect() {
    const video = this.state.video;
    if (!video.videoWidth || !video.videoHeight) return;

    const result = await this.detector.detect(video, this.state.debugCanvas, this.state.face !== null);
    if (!this.running) return;
    if (!result) {
      if (this.state.face && this.settings.debug) console.log(`${APP_TITLE}: face lost`);
      this.state.face = null;
      return;
    }

    this.state.face = result;

    if (this.settings.debug) console.log(`${APP_TITLE}: face found`, this.state.face);
  }

  private render() {
    const { ctx, mirrored } = this.state;
    const params = { ctx, mirrored, ...this.canvasSize, box: this.state.face };
    this.clearCanvas();
    for (const feature of FEATURES) {
      if (this.settings.overlays[feature]?.enabled)
        RENDERERS[feature]({ ...params, size: this.settings.overlays[feature]?.size });
    }
    if (this.settings.debug) renderDebugBox(params);
  }
}
