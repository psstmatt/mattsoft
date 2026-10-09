import { describe, expect, it } from "bun:test";
import {
  computerLayout,
  applyComputerLayout,
  allowsComputerCameraMotion,
} from "../public/experience/konami-layout.js";
import { entryViewportGeometry } from "../public/experience/konami-transition.js";

describe("shared computer layout", () => {
  it("caps portrait phones at a 78vw square with a centered body", () => {
    for (const [width, height, expectedSize] of [
      [320, 568, 249.6],
      [390, 664, 304.2],
      [430, 932, 335.4],
      [700, 900, 546],
    ]) {
      const pose = computerLayout(width, height);
      expect(pose.s).toBeCloseTo(expectedSize, 7);
      expect(pose.x + pose.s / 2).toBeCloseTo(width / 2, 7);
      // The initial case's opaque body occupies x=95..795 in its 960px frame.
      expect((pose.s * 700) / 960 / width).toBeCloseTo(0.56875, 7);
      expect(pose.y).toBeGreaterThanOrEqual(0);
      expect(pose.y + pose.s).toBeLessThanOrEqual(height);
    }
  });

  it("preserves desktop framing and constrains short landscape viewports by height", () => {
    expect(computerLayout(1440, 900)).toEqual({ x: 423, y: 162, s: 594 });
    const wide = computerLayout(2560, 1440);
    expect(wide.x).toBeCloseTo(804.8, 7);
    expect(wide.y).toBeCloseTo(259.2, 7);
    expect(wide.s).toBeCloseTo(950.4, 7);
    const landscape = computerLayout(844, 390);
    expect(landscape.s).toBeCloseTo(257.4, 7);
    expect(landscape.x + landscape.s / 2).toBe(422);
    expect(landscape.y).toBeCloseTo(70.2, 7);
    expect(landscape.y + landscape.s).toBeLessThan(390);
  });

  it("gives the poster exactly the renderer size and vertical offset", () => {
    const properties = new Map<string, string>();
    const element = {
      style: { setProperty: (key: string, value: string) => properties.set(key, value) },
    };
    for (const [width, height] of [
      [390, 664],
      [1440, 900],
    ]) {
      const pose = applyComputerLayout(element, width, height);
      const size = Number.parseFloat(properties.get("--computer-scene-size")!);
      const offset = Number.parseFloat(properties.get("--computer-scene-offset-y")!);
      expect(size).toBe(pose.s);
      expect(height / 2 + offset - size / 2).toBe(pose.y);
      expect((width - size) / 2).toBe(pose.x);
    }
  });

  it("uses the stable stage dimensions through browser chrome changes", () => {
    const stableStage = { clientWidth: 390, clientHeight: 664 };
    const element = { style: { setProperty() {} } };
    const before = applyComputerLayout(element, stableStage.clientWidth, stableStage.clientHeight);
    const previous = Object.getOwnPropertyDescriptor(globalThis, "innerHeight");
    try {
      for (const browserHeight of [664, 744, 704, 664]) {
        Object.defineProperty(globalThis, "innerHeight", {
          configurable: true,
          value: browserHeight,
        });
        expect(
          applyComputerLayout(element, stableStage.clientWidth, stableStage.clientHeight),
        ).toEqual(before);
      }
    } finally {
      if (previous) Object.defineProperty(globalThis, "innerHeight", previous);
      else Reflect.deleteProperty(globalThis, "innerHeight");
    }
  });

  it("reframes for a real orientation change and returns to the exact portrait pose", () => {
    const portrait = computerLayout(390, 664);
    const landscape = computerLayout(664, 390);
    expect(landscape.s).toBeCloseTo(257.4, 7);
    expect(landscape.x + landscape.s / 2).toBe(332);
    expect(landscape.y).toBeCloseTo(70.2, 7);
    expect(computerLayout(390, 664)).toEqual(portrait);
  });

  it("preserves frame-zero body bounds when a selected card is promoted", () => {
    const pose = computerLayout(390, 664);
    for (const scale of [1, 0.75]) {
      const rect = { left: 24, top: 40, width: 390 * scale, height: 664 * scale };
      const promoted = entryViewportGeometry(rect, pose, 390, 664, 390, 744);
      expect(promoted.uniform).toBe(true);
      expect(promoted.from.s).toBeCloseTo(pose.s * scale, 7);
      expect(promoted.from.x).toBeCloseTo(24 + pose.x * scale, 7);
      expect(promoted.from.y).toBeCloseTo(40 + pose.y * scale, 7);
      expect(promoted.width).toBe(390);
      expect(promoted.height).toBe(744);
    }
  });

  it("ignores invalid or hidden stage measurements without replacing the poster fallback", () => {
    const properties = new Map<string, string>();
    const element = {
      style: { setProperty: (key: string, value: string) => properties.set(key, value) },
    };
    for (const [width, height] of [
      [0, 664],
      [390, 0],
      [-1, 664],
      [NaN, 664],
      [390, Infinity],
    ]) {
      expect(applyComputerLayout(element, width, height)).toEqual({ x: 0, y: 0, s: 0 });
      expect(properties.size).toBe(0);
    }
  });
});

describe("computer camera motion", () => {
  it("allows fine-pointer parallax while keeping coarse touch and reduced motion steady", () => {
    expect(allowsComputerCameraMotion(true, false)).toBe(true);
    expect(allowsComputerCameraMotion(false, false)).toBe(false);
    expect(allowsComputerCameraMotion(true, true)).toBe(false);
    expect(allowsComputerCameraMotion(false, true)).toBe(false);
  });
});
