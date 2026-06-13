import type { Detector } from "./detector";
import type { FaceBox } from "../shared/types";

/**
 * Enable Chrome Experimental Web Platform Features: Face Detection API
 * @link chrome://flags/#enable-experimental-web-platform-features
 * */
export class NativeDetector implements Detector {
  static isSupported(): boolean {
    return "FaceDetector" in globalThis;
  }

  readonly name = "native";
  private detector: FaceDetector | null = null;

  async init(): Promise<boolean> {
    if (!FaceDetector) return false;
    try {
      this.detector = new FaceDetector({ maxDetectedFaces: 10, fastMode: true });
      return true;
    } catch {
      return false;
    }
  }

  async detect(video: HTMLVideoElement): Promise<FaceBox | null> {
    if (!this.detector) return null;
    try {
      const faces = await this.detector.detect(video);
      if (!faces || faces.length === 0) return null;
      const face = faces[0];
      const result: FaceBox = {
        x: face.boundingBox.x,
        y: face.boundingBox.y,
        width: face.boundingBox.width,
        height: face.boundingBox.height,
      };
      if (face.landmarks) {
        const nose = face.landmarks.find((lm) => lm.type === "nose");
        if (nose?.locations?.[0]) {
          result.noseX = nose.locations[0].x;
          result.noseY = nose.locations[0].y;
        } else {
          const eye = face.landmarks.find((lm) => lm.type === "eye");
          const mouth = face.landmarks.find((lm) => lm.type === "mouth");
          if (eye?.locations?.[0] && mouth?.locations?.[0]) {
            result.noseX = mouth.locations[0].x;
            result.noseY = (eye.locations[0].y + mouth.locations[0].y) / 2;
          }
        }

        const eyes = face.landmarks.filter((lm) => lm.type === "eye");
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
