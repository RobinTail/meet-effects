/// <reference types="vite/client" />

declare const CASCADE_URL: string;
declare const APP_TITLE: string;
declare const FEATURES: import("./src/shared/types").Feature[];

interface FaceDetector {
  detect(video: HTMLVideoElement): Promise<NativeDetectedFace[]>;
}

interface Landmark {
  type: string;
  locations: { x: number; y: number }[];
}

interface NativeDetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks?: Landmark[];
}

interface FaceDetectorOptions {
  maxDetectedFaces?: number;
  fastMode?: boolean;
}

interface FaceDetectorConstructor {
  new (opts?: FaceDetectorOptions): FaceDetector;
}

/**
 * Enable Chrome Experimental Web Platform Features: Face Detection API
 * @link chrome://flags/#enable-experimental-web-platform-features
 * */
declare const FaceDetector: FaceDetectorConstructor | undefined;
