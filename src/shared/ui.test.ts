import { describe, it, expect } from "vitest";
import { controlsHTML } from "./ui";

describe("controlsHTML", () => {
  it("matches snapshot", () => {
    expect(controlsHTML()).toMatchSnapshot();
  });
});
