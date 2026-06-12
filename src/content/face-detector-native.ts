import type { Detector } from "./detector";
import type { FaceBox } from "../shared/types";

interface NativeFaceLandmark {
  type: string;
  locations: { x: number; y: number }[];
}

interface NativeDetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks?: NativeFaceLandmark[];
}

/**
 * Enable Chrome Experimental Web Platform Features: Face Detection API
 * @link chrome://flags/#enable-experimental-web-platform-features
 * */
export class NativeDetector implements Detector {
  static isSupported(): boolean {
    return "FaceDetector" in globalThis;
  }

  readonly name = "native";
  private detector: { detect(v: HTMLVideoElement): Promise<NativeDetectedFace[]> } | null = null;

  async init(): Promise<boolean> {
    if (!NativeDetector.isSupported()) return false;
    try {
      const FaceDetectorCtor = (globalThis as any).FaceDetector as new (opts?: {
        maxDetectedFaces?: number;
        fastMode?: boolean;
      }) => typeof this.detector;
      this.detector = new FaceDetectorCtor({ maxDetectedFaces: 10, fastMode: true });
      return true;
    } catch {
      return false;
    }
  }

  async detect(video: HTMLVideoElement, _debugCanvas?: HTMLCanvasElement): Promise<FaceBox | null> {
    if (!this.detector) return null;
    try {
      const faces = await this.detector.detect(video);
      if (!faces || faces.length === 0) return null;
      const f = faces[0];
      const result: FaceBox = {
        x: f.boundingBox.x,
        y: f.boundingBox.y,
        width: f.boundingBox.width,
        height: f.boundingBox.height,
      };
      if (f.landmarks) {
        const nose = f.landmarks.find((lm) => lm.type === "nose");
        if (nose?.locations?.[0]) {
          result.noseX = nose.locations[0].x;
          result.noseY = nose.locations[0].y;
        } else {
          const eye = f.landmarks.find((lm) => lm.type === "eye");
          const mouth = f.landmarks.find((lm) => lm.type === "mouth");
          if (eye?.locations?.[0] && mouth?.locations?.[0]) {
            result.noseX = mouth.locations[0].x;
            result.noseY = (eye.locations[0].y + mouth.locations[0].y) / 2;
          }
        }

        const eyes = f.landmarks.filter((lm) => lm.type === "eye");
        if (eyes.length >= 2) {
          result.eyeLX = eyes[0].locations[0]?.x;
          result.eyeLY = eyes[0].locations[0]?.y;
          result.eyeRX = eyes[1].locations[0]?.x;
          result.eyeRY = eyes[1].locations[0]?.y;
        }
      }

      return result;
    } catch {
      return null;
    }
  }
}
