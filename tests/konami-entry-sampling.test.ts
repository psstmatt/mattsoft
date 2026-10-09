import { describe, expect, it } from "bun:test";
import {
  entrySamplingViewport,
  alignPortfolioEntryTarget,
} from "../public/experience/konami-entry-sampling.js";
import { entryPortfolioTarget, portfolioPageBox } from "../public/experience/konami-transition.js";

// Mirror the shader's mathematical mapping, independently of animation timing.
// Coordinates are CSS pixels in the source page, not pixels of the small CRT.
const tube = { x0: 0, y0: 0, x1: 1.222823, y1: 1 };
function sourcePoint(view: { width: number; height: number }, u: number, v: number) {
  const box = portfolioPageBox(tube, view.width, view.height);
  return [393 / 2 + ((u - 0.5) / box.w) * view.width, (0.5 - (v - 0.5) / box.h) * view.height];
}

describe("WebGL page window during viewport promotion", () => {
  it("retains the exact selected CRT content at frame zero", () => {
    const stage = { width: 393, height: 664 };
    const viewport = { width: 393, height: 844 };
    const before = sourcePoint(stage, 0.4, 0.7);
    const first = sourcePoint(entrySamplingViewport(stage, viewport, 0), 0.4, 0.7);
    expect(first).toEqual(before);
    // This was the old tap-time jump, even before the camera moved.
    expect(Math.abs(sourcePoint(viewport, 0.4, 0.7)[1] - before[1])).toBeCloseTo(45);
  });

  it("changes sampling continuously and reaches the full visible viewport", () => {
    const stage = { width: 393, height: 664 };
    const viewport = { width: 393, height: 844 };
    let previous = sourcePoint(stage, 0.4, 0.7);
    for (let step = 1; step <= 100; step++) {
      const next = sourcePoint(entrySamplingViewport(stage, viewport, step / 100), 0.4, 0.7);
      expect(Math.abs(next[0] - previous[0])).toBeLessThan(1);
      expect(Math.abs(next[1] - previous[1])).toBeLessThan(1);
      previous = next;
    }
    expect(previous).toEqual(sourcePoint(viewport, 0.4, 0.7));
  });

  it("leaves the original page window unchanged when dimensions already match", () => {
    const view = { width: 1200, height: 800 };
    for (const progress of [-1, 0, 0.3, 0.7, 1, 2]) {
      expect(entrySamplingViewport(view, view, progress)).toEqual(view);
    }
  });

  it("retains full-tube coverage after either toolbar direction or orientation size", () => {
    for (const [from, to] of [
      [
        { width: 393, height: 664 },
        { width: 393, height: 844 },
      ],
      [
        { width: 393, height: 844 },
        { width: 393, height: 664 },
      ],
      [
        { width: 844, height: 340 },
        { width: 844, height: 393 },
      ],
      [
        { width: 1200, height: 800 },
        { width: 1200, height: 800 },
      ],
    ]) {
      const sample = entrySamplingViewport(from, to, 1);
      const target = entryPortfolioTarget(tube, sample.width, sample.height);
      expect(target.x + tube.x0 * target.s).toBeLessThanOrEqual(0);
      expect(target.y + tube.y0 * target.s).toBeLessThanOrEqual(0);
      expect(target.x + tube.x1 * target.s).toBeGreaterThanOrEqual(to.width);
      expect(target.y + tube.y1 * target.s).toBeGreaterThanOrEqual(to.height);
    }
  });

  it("lands capture CSS pixels at their actual surface position with a scrollbar gutter", () => {
    const width = 644,
      height = 757,
      captureWidth = 629,
      left = 0;
    const box = portfolioPageBox(tube, width, height);
    const target = alignPortfolioEntryTarget(
      entryPortfolioTarget(tube, width, height),
      width,
      captureWidth,
      left,
    );
    for (const u of [0.4, 0.5, 0.6]) {
      const sourceX = captureWidth / 2 + ((u - 0.5) / box.w) * width;
      const screenX = target.x + (tube.x0 + u * (tube.x1 - tube.x0)) * target.s;
      expect(screenX).toBeCloseTo(left + sourceX, 8);
    }
  });
});
