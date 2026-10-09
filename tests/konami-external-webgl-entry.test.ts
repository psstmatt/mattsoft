import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  externalEntryTarget,
  externalEntrySample,
  finishExternalViewport,
} from "../public/experience/konami-external-entry.js";
import { entryFittedTarget } from "../public/experience/konami-canvas-entry.js";

const mesh = JSON.parse(
  readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url), "utf8"),
);
const points = mesh.frame.screenMesh.map(([x, y]: number[]) => [x / mesh.width, y / mesh.width]);
const bounds = {
  x0: Math.min(...points.map(([x]: number[]) => x)),
  x1: Math.max(...points.map(([x]: number[]) => x)),
  y0: Math.min(...points.map(([, y]: number[]) => y)),
  y1: Math.max(...points.map(([, y]: number[]) => y)),
};
const reference = { naturalWidth: 1173, naturalHeight: 2168 };

describe("external WebGL fitted screen entry", () => {
  it("resizes only the final external canvas to the current toolbar or orientation dimensions", () => {
    const canvas = { width: 786, height: 1328, style: { width: "393px", height: "664px" } };
    const view = finishExternalViewport(canvas, { width: 393, height: 664 }, 2, {
      innerWidth: 393,
      innerHeight: 844,
    });
    expect(view).toEqual({ width: 393, height: 844 });
    expect(canvas).toEqual({
      width: 786,
      height: 1688,
      style: { width: "393px", height: "844px" },
    });
    const rotated = finishExternalViewport(canvas, view, 2, { innerWidth: 844, innerHeight: 393 });
    expect(rotated).toEqual({ width: 844, height: 393 });
    const target = externalEntryTarget(bounds, rotated, reference);
    const pose = entryFittedTarget(bounds, rotated.width);
    expect(pose.x + target.x1 * pose.s).toBeCloseTo(844, 8);
    expect(pose.y + target.y1 * pose.s).toBeCloseTo(393, 8);
  });
  it("flattens the actual tube into the entire portrait or landscape viewport", () => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1186, height: 757 },
    ]) {
      const target = externalEntryTarget(bounds, viewport, reference);
      const pose = entryFittedTarget(bounds, viewport.width);
      expect(pose.x + target.x0 * pose.s).toBeCloseTo(0, 8);
      expect(pose.y + target.y0 * pose.s).toBeCloseTo(0, 8);
      expect(pose.x + target.x1 * pose.s).toBeCloseTo(viewport.width, 8);
      expect(pose.y + target.y1 * pose.s).toBeCloseTo(viewport.height, 8);
      const sourceHeight = reference.naturalHeight * target.sampleHeight;
      expect(viewport.height / sourceHeight).toBeCloseTo(
        viewport.width / reference.naturalWidth,
        10,
      );
    }
  });

  it("keeps the original preview sample before moving and reveals more page continuously", () => {
    const preview = reference.naturalWidth / 1.28 / reference.naturalHeight;
    const target = externalEntryTarget(bounds, { width: 390, height: 844 }, reference);
    expect(externalEntrySample(preview, target.sampleHeight, 0)).toBe(preview);
    expect(externalEntrySample(preview, target.sampleHeight, 1)).toBe(target.sampleHeight);
    const midpoint = externalEntrySample(preview, target.sampleHeight, 0.5);
    expect(midpoint).toBeCloseTo((preview + target.sampleHeight) / 2, 10);
  });

  it("does not stretch or clamp a short capture to cover a tall browser", () => {
    const viewport = { width: 390, height: 844 };
    const target = externalEntryTarget(bounds, viewport, reference);
    expect(target.sampleHeight).toBeGreaterThan(1);
    const imageBottom = (reference.naturalHeight * viewport.width) / reference.naturalWidth;
    expect(imageBottom).toBeCloseTo(720.818414322, 6);
    expect(viewport.height - imageBottom).toBeCloseTo(123.181585678, 6);
  });

  it("samples before the external background mask, expands clipping bounds, and has one normal handoff", () => {
    const source = readFileSync(
      new URL("../public/experience/konami-computer-scene.js", import.meta.url),
      "utf8",
    );
    expect(source.indexOf("vec3 col =")).toBeLessThan(source.indexOf("if (uExternal) {"));
    expect(source).toContain("mix(uPageBackground, col, hasPage)");
    expect(source).toContain("external && D ? ce() : L");
    const enter = source.slice(source.indexOf("async enter(t)"));
    expect(enter.indexOf("if (external) entryScroll = scrollStart")).toBeLessThan(
      enter.indexOf("je(performance.now())"),
    );
    const animation = enter.slice(enter.indexOf("await runEntryTransition"));
    expect(animation).not.toContain("await fadeCanvasToPreview");
  });
});
