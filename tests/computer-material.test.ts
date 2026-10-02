import { describe, expect, it } from "bun:test";
import { greenPlastic } from "../public/experience/computer-material.js";
const luminance = (color: number[]) => color[0]! * 0.2126 + color[1]! * 0.7152 + color[2]! * 0.0722;
describe("selective green computer material", () => {
  it("preserves neutral trim, shadows, and bright highlights", () => {
    for (const value of [0, 0.04, 0.2, 0.5, 0.9, 1])
      expect(greenPlastic(value, value, value)).toEqual([value, value, value]);
  });
  it("recolors golden plastic without flattening luminance", () => {
    for (const source of [
      [0.98, 0.78, 0.45],
      [0.7, 0.5, 0.18],
      [0.35, 0.25, 0.08],
    ]) {
      const result = greenPlastic(...source);
      expect(result[1]).toBeGreaterThan(result[0]);
      expect(Math.abs(luminance(result) - luminance(source))).toBeLessThan(0.001);
    }
  });
});
