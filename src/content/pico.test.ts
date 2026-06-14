import { grayscale } from "./pico";

function rgba(red: number, green: number, blue: number, alpha: number): number[] {
  return [red, green, blue, alpha];
}

function flatImageData(pixels: number[][]): ImageData {
  return { data: new Uint8ClampedArray(pixels.flat()) } as ImageData;
}

function toInt8(value: number): number {
  return new Int8Array([value])[0];
}

describe("grayscale", () => {
  it("single black pixel", () => {
    const result = grayscale(flatImageData([rgba(0, 0, 0, 255)]), 1, 1);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.pixels[0]).toBe(0);
  });

  it("single white pixel", () => {
    const result = grayscale(flatImageData([rgba(255, 255, 255, 255)]), 1, 1);
    expect(result.pixels[0]).toBe(toInt8(255));
  });

  it("pure red", () => {
    const result = grayscale(flatImageData([rgba(255, 0, 0, 255)]), 1, 1);
    const expected = (255 * 77 + 128) >> 8;
    expect(result.pixels[0]).toBe(toInt8(expected));
  });

  it("pure green", () => {
    const result = grayscale(flatImageData([rgba(0, 255, 0, 255)]), 1, 1);
    const expected = (255 * 151 + 128) >> 8;
    expect(result.pixels[0]).toBe(toInt8(expected));
  });

  it("pure blue", () => {
    const result = grayscale(flatImageData([rgba(0, 0, 255, 255)]), 1, 1);
    const expected = (255 * 28 + 128) >> 8;
    expect(result.pixels[0]).toBe(toInt8(expected));
  });

  it("ignores alpha channel", () => {
    const opaque = grayscale(flatImageData([rgba(100, 150, 200, 255)]), 1, 1);
    const transparent = grayscale(flatImageData([rgba(100, 150, 200, 0)]), 1, 1);
    expect(transparent.pixels[0]).toBe(opaque.pixels[0]);
  });

  it("matches luminance formula for multiple pixels", () => {
    const px = [rgba(10, 20, 30, 255), rgba(200, 180, 50, 255), rgba(0, 255, 128, 255), rgba(80, 90, 240, 255)];
    const result = grayscale(flatImageData(px), 2, 2);

    for (let idx = 0; idx < 4; idx++) {
      const [red, green, blue] = px[idx];
      const expected = (red * 77 + green * 151 + blue * 28 + 128) >> 8;
      expect(result.pixels[idx]).toBe(toInt8(expected));
    }
  });

  it("signed overflow for values above 127", () => {
    const bright = [rgba(200, 200, 200, 255)];
    const result = grayscale(flatImageData(bright), 1, 1);
    const computed = (200 * 77 + 200 * 151 + 200 * 28 + 128) >> 8;
    expect(computed).toBe(200);
    expect(result.pixels[0]).toBe(toInt8(200));
    expect(result.pixels[0]).toBe(-56);
  });

  it("processes only width*height pixels, not the full buffer", () => {
    const data = [rgba(0, 0, 0, 255), rgba(255, 255, 255, 255), rgba(128, 128, 128, 255), rgba(64, 64, 64, 255)];
    const result = grayscale(flatImageData(data), 1, 1);
    expect(result.pixels).toHaveLength(1);
  });

  it("rounds using integer floor (>> 8)", () => {
    const red = 1;
    const green = 1;
    const blue = 1;
    const result = grayscale(flatImageData([rgba(red, green, blue, 255)]), 1, 1);
    const expected = (red * 77 + green * 151 + blue * 28 + 128) >> 8;
    expect(result.pixels[0]).toBe(toInt8(expected));
    expect(result.pixels[0]).toBe(toInt8(1));
  });

  it("returns provided width and height on result", () => {
    const result = grayscale(flatImageData([rgba(0, 0, 0, 255)]), 640, 480);
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  });

  it("handles a 3x1 multi-pixel row", () => {
    const px = [rgba(0, 0, 0, 255), rgba(128, 128, 128, 255), rgba(255, 255, 255, 255)];
    const result = grayscale(flatImageData(px), 3, 1);
    expect(result.pixels).toHaveLength(3);
    expect(result.pixels[0]).toBe(toInt8(0));
    expect(result.pixels[1]).toBe(toInt8(128));
    expect(result.pixels[2]).toBe(toInt8(255));
  });

  it("stores data in signed Int8Array", () => {
    const result = grayscale(flatImageData([rgba(255, 255, 255, 255)]), 1, 1);
    expect(result.pixels).toBeInstanceOf(Int8Array);
    expect(result.pixels[0]).toBeLessThan(0);
    expect(result.pixels[0]).toBe(-1);
  });

  it("boundary value 127 stays positive, 128 wraps negative", () => {
    const result = grayscale(flatImageData([rgba(128, 128, 128, 255)]), 1, 1);
    const computed = (128 * 77 + 128 * 151 + 128 * 28 + 128) >> 8;
    expect(computed).toBe(128);
    expect(result.pixels[0]).toBe(toInt8(128));
    expect(result.pixels[0]).toBe(-128);
  });
});
