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
        const eyes = face.landmarks
          .filter((lm) => lm.type === "eye")
          .sort((one, other) => (one.locations[0]?.x ?? 0) - (other.locations[0]?.x ?? 0));
        if (eyes.length >= 2) {
          result.eyeLX = eyes[0].locations[0]?.x;
          result.eyeLY = eyes[0].locations[0]?.y;
          result.eyeRX = eyes[1].locations[0]?.x;
          result.eyeRY = eyes[1].locations[0]?.y;
        }

        const nose = face.landmarks.find((lm) => lm.type === "nose");
        if (nose?.locations?.[0]) {
          result.noseX = nose.locations[0].x;
          result.noseY = nose.locations[0].y;
        } else if (result.eyeLY !== undefined && result.eyeRY !== undefined) {
          const mouth = face.landmarks.find((lm) => lm.type === "mouth");
          if (mouth?.locations?.[0]) {
            const eyesMidY = (result.eyeLY + result.eyeRY) / 2;
            result.noseX = mouth.locations[0].x;
            result.noseY = (eyesMidY + mouth.locations[0].y) / 2;
          }
        }
      }

      return result;
    } catch {
      return null;
    }
  }
}
