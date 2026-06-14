import { getEyeInfo } from "./eye-angle";
import type { FaceBox } from "../shared/types";

function box(overrides?: Partial<FaceBox>): FaceBox {
  return {
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    eyeLX: 100,
    eyeLY: 200,
    eyeRX: 300,
    eyeRY: 220,
    ...overrides,
  };
}

describe("getEyeInfo", () => {
  describe("returns undefined when eye landmarks are missing", () => {
    it("all eye landmarks undefined", () => {
      expect(
        getEyeInfo(box({ eyeLX: undefined, eyeLY: undefined, eyeRX: undefined, eyeRY: undefined }), 640, 1, 1, false),
      ).toBeUndefined();
    });

    it("only left eye present", () => {
      expect(getEyeInfo(box({ eyeRX: undefined, eyeRY: undefined }), 640, 1, 1, false)).toBeUndefined();
    });

    it("only right eye present", () => {
      expect(getEyeInfo(box({ eyeLX: undefined, eyeLY: undefined }), 640, 1, 1, false)).toBeUndefined();
    });

    it("left eye X missing", () => {
      expect(getEyeInfo(box({ eyeLX: undefined }), 640, 1, 1, false)).toBeUndefined();
    });

    it("left eye Y missing", () => {
      expect(getEyeInfo(box({ eyeLY: undefined }), 640, 1, 1, false)).toBeUndefined();
    });

    it("right eye X missing", () => {
      expect(getEyeInfo(box({ eyeRX: undefined }), 640, 1, 1, false)).toBeUndefined();
    });

    it("right eye Y missing", () => {
      expect(getEyeInfo(box({ eyeRY: undefined }), 640, 1, 1, false)).toBeUndefined();
    });
  });

  describe("non-mirrored", () => {
    it("computes correct values with scale 1", () => {
      const result = getEyeInfo(box(), 640, 1, 1, false);
      expect(result).toBeDefined();
      const info = result!;
      expect(info.cx).toBe(100);
      expect(info.cy).toBe(200);
      expect(info.cx2).toBe(300);
      expect(info.cy2).toBe(220);
      expect(info.midX).toBe(200);
      expect(info.midY).toBe(210);
      expect(info.halfDist).toBeCloseTo(Math.hypot(200, 20) / 2, 10);
      expect(info.angle).toBeCloseTo(Math.atan2(20, 200), 10);
    });

    it("applies scaleX and scaleY", () => {
      const result = getEyeInfo(box(), 640, 2, 0.5, false);
      expect(result).toBeDefined();
      const info = result!;
      expect(info.cx).toBe(200);
      expect(info.cy).toBe(100);
      expect(info.cx2).toBe(600);
      expect(info.cy2).toBe(110);
      expect(info.midX).toBe(400);
      expect(info.midY).toBe(105);
    });

    it("handles zero canvas width", () => {
      const result = getEyeInfo(box(), 0, 1, 1, false);
      expect(result).toBeDefined();
      expect(result!.cx).toBe(100);
      expect(result!.cx2).toBe(300);
    });

    it("vertical eyes (angle = PI/2)", () => {
      const result = getEyeInfo(box({ eyeLX: 200, eyeLY: 100, eyeRX: 200, eyeRY: 300 }), 640, 1, 1, false);
      expect(result).toBeDefined();
      expect(result!.angle).toBeCloseTo(Math.PI / 2, 10);
      expect(result!.halfDist).toBeCloseTo(100, 10);
    });

    it("horizontal eyes (angle = 0)", () => {
      const result = getEyeInfo(box({ eyeLX: 100, eyeLY: 200, eyeRX: 300, eyeRY: 200 }), 640, 1, 1, false);
      expect(result).toBeDefined();
      expect(result!.angle).toBeCloseTo(0, 10);
      expect(result!.halfDist).toBeCloseTo(100, 10);
    });
  });

  describe("mirrored", () => {
    it("flips x-coordinates and negates angle", () => {
      const result = getEyeInfo(box(), 640, 1, 1, true);
      expect(result).toBeDefined();
      const info = result!;
      expect(info.cx).toBe(540);
      expect(info.cy).toBe(200);
      expect(info.cx2).toBe(340);
      expect(info.cy2).toBe(220);
      expect(info.midX).toBe(440);
      expect(info.midY).toBe(210);
      expect(info.angle).toBeCloseTo(-Math.atan2(20, 200), 10);
    });

    it("flip preserves halfDist", () => {
      const normal = getEyeInfo(box(), 640, 1, 1, false);
      const mirrored = getEyeInfo(box(), 640, 1, 1, true);
      expect(normal!.halfDist).toBe(mirrored!.halfDist);
    });
  });

  describe("edge cases", () => {
    it("eyes at same position (zero distance)", () => {
      const result = getEyeInfo(box({ eyeLX: 200, eyeLY: 200, eyeRX: 200, eyeRY: 200 }), 640, 1, 1, false);
      expect(result).toBeDefined();
      expect(result!.halfDist).toBe(0);
      expect(result!.angle).toBeCloseTo(Math.atan2(0, 0), 10);
    });

    it("negative scale values", () => {
      const result = getEyeInfo(box(), 640, -1, -1, false);
      expect(result).toBeDefined();
      expect(result!.cx).toBe(-100);
      expect(result!.cy).toBe(-200);
    });

    it("zero scale flips everything to origin", () => {
      const result = getEyeInfo(box(), 640, 0, 0, false);
      expect(result).toBeDefined();
      expect(result!.cx).toBe(0);
      expect(result!.cy).toBe(0);
      expect(result!.cx2).toBe(0);
      expect(result!.cy2).toBe(0);
      expect(result!.halfDist).toBe(0);
      expect(result!.angle).toBeCloseTo(Math.atan2(0, 0), 10);
    });

    it("very large coordinates", () => {
      const result = getEyeInfo(box({ eyeLX: 1e6, eyeLY: 2e6, eyeRX: 3e6, eyeRY: 4e6 }), 1e7, 1, 1, false);
      expect(result).toBeDefined();
      expect(result!.midX).toBe(2e6);
      expect(result!.midY).toBe(3e6);
    });
  });
});
