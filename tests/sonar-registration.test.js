import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  sonarScreenGeometry,
  sonarPose,
  sonarGroovePixel,
  sonarInteractionTarget,
  easeSonarInteraction,
  sonarScreenPoint,
  sonarAperturePoints,
} from "../public/experience/sonar-registration.js";

describe("Sonar07 registration and material", () => {
  it("covers every bowed aperture edge rather than exposing background outside a straight quad", () => {
    const source = JSON.parse(
      readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url)),
    );
    const contains = (polygon, [x, y]) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i],
          [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    const edge = sonarAperturePoints(64);
    // These real edge samples lay outside the old page, matching the reported
    // pale crescents. Keep this assertion so the test catches that regression.
    const oldQuad = [
      [330, 331],
      [880, 297],
      [867, 802],
      [270, 802],
    ];
    expect(edge.filter((point) => !contains(oldQuad, point)).length).toBeGreaterThan(100);
    for (const width of [384, 768, 1254, 1536]) {
      const meta = sonarScreenGeometry({ ...source, width });
      for (const point of edge)
        expect(
          contains(
            meta.frame.screenBoundary,
            point.map((n) => (n * width) / 1254),
          ),
        ).toBe(true);
    }
    // Bowed side and top differ from a flat projective quadrilateral.
    expect(sonarScreenPoint(0, 0.5)[0]).toBeLessThan((320 + 263) / 2);
    expect(sonarScreenPoint(0.5, 0)[1]).toBeLessThan((323 + 285) / 2);
  });
  it("uses a distinct registered aperture and preserves shared topology", () => {
    const topology = {
      uv: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0.5, 0.5],
      ],
    };
    const meta = sonarScreenGeometry({ width: 768, topology });
    expect(meta.topology).toBe(topology);
    expect(meta.frame.screenMesh.slice(0, 4)).toEqual(meta.frame.screenQuad);
    for (const point of meta.frame.screenMesh) {
      expect(point.every((n) => Number.isFinite(n) && n > 0 && n < 768)).toBe(true);
    }
    expect(meta.frame.screenQuad[1][1]).toBeLessThan(meta.frame.screenQuad[0][1]);
  });
  it("keeps the measured pose proportional through viewport changes", () => {
    const small = sonarPose({ x: 12, y: 30, s: 200 });
    const large = sonarPose({ x: 24, y: 60, s: 400 });
    expect(large).toEqual({ x: small.x * 2, y: small.y * 2, s: small.s * 2 });
  });
  it("brightens only blue front grooves, preserving trim and side detail", () => {
    const quiet = sonarGroovePixel(80, 110, 180, 255, 0.4, 0.25, 0);
    const selected = sonarGroovePixel(80, 110, 180, 255, 0.4, 0.25, 0.62);
    expect(quiet).toEqual([80, 110, 180, 255]);
    expect(selected[1]).toBeGreaterThan(quiet[1]);
    expect(sonarGroovePixel(80, 110, 180, 255, 0.9, 0.4, 0.62)).toEqual(quiet);
    expect(sonarGroovePixel(210, 210, 205, 255, 0.6, 0.7, 0.62)).toEqual([210, 210, 205, 255]);
    expect(sonarGroovePixel(4, 6, 12, 255, 0.4, 0.3, 0.62)).toEqual([4, 6, 12, 255]);
    expect(sonarGroovePixel(80, 110, 180, 2, 0.4, 0.4, 0.62)).toEqual([0, 0, 0, 0]);
  });
  it("distinguishes selected hover and keyboard focus without amplifying quiet neighboring cases", () => {
    const selected = sonarInteractionTarget(true, false, false);
    const hover = sonarInteractionTarget(true, true, false);
    const focus = sonarInteractionTarget(true, false, true);
    expect(hover.emission).toBeGreaterThan(selected.emission);
    expect(focus.emission).toBeGreaterThan(selected.emission);
    expect(sonarInteractionTarget(false, true, false).emission).toBeLessThan(selected.emission);
    expect(sonarInteractionTarget(false, false, false)).toEqual({ emission: 0, lift: 0 });
    expect(sonarInteractionTarget(true, true, false, true).lift).toBe(0);
  });
  it("eases repeated enter/leave from the current value and settles reduced motion immediately", () => {
    const midway = easeSonarInteraction(0, 1, 70);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    expect(easeSonarInteraction(midway, 0, 16)).toBeLessThan(midway);
    expect(easeSonarInteraction(midway, 1, 16)).toBeGreaterThan(midway);
    expect(easeSonarInteraction(midway, 0.48, 16, true)).toBe(0.48);
    expect(easeSonarInteraction(0.001, 0, 16)).toBe(0);
    expect(sonarGroovePixel(30, 54, 105, 255, 0.4, 0.4, 1)).toEqual([30, 54, 105, 255]);
  });
});
