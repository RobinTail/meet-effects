import type { FaceBox } from "../shared/types";

export interface Detector {
  readonly name: string;
  init(): Promise<boolean>;
  detect(video: HTMLVideoElement, debugCanvas?: HTMLCanvasElement, currentlyHasFace?: boolean): Promise<FaceBox | null>;
}
