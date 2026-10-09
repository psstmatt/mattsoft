import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  runEntryTransition,
  entryViewportGeometry,
  entryCoverTarget,
  entryPortfolioTarget,
  portfolioPageBox,
  hasComplexEntryTransform,
  promoteEntryCanvas,
  ZOOM_MS,
} from "../public/experience/konami-transition.js";
import { portfolioRasterSample } from "../public/experience/konami-canvas-scene.js";

function animationEnvironment() {
  let now = 0,
    id = 0;
  const frames = new Map<number, (n: number) => void>();
  const timers = new Map<number, () => void>();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const events = new EventTarget();
  const env = {
    document,
    performance: { now: () => now },
    requestAnimationFrame: (callback: (n: number) => void) => {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (key: number) => frames.delete(key),
    setTimeout: (callback: () => void) => {
      timers.set(++id, callback);
      return id;
    },
    clearTimeout: (key: number) => timers.delete(key),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  return {
    env,
    frames,
    timers,
    advance(value: number) {
      now = value;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(value));
    },
    resize() {
      events.dispatchEvent(new Event("resize"));
    },
    hide() {
      document.hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}
const root = new URL("../public/experience/", import.meta.url);
const source = (name: string) => readFileSync(new URL(name, root), "utf8");

describe("Konami entry ownership", () => {
  it("pauses retained WebGL frames independently from canvas visibility", () => {
    const scene = source("konami-computer-scene.js");
    const activity = scene.slice(
      scene.indexOf("setActive(value)"),
      scene.indexOf("setVisible(value)"),
    );
    expect(activity).toContain("active = !!value");
    expect(activity).toContain("cancelAnimationFrame(R)");
    expect(activity).toContain("clearTimeout(prefetchTimer)");
    expect(activity).toContain("clearTimeout(snapshotTimer)");
    expect(activity).not.toContain("style.visibility");
    expect(activity).not.toContain("u.width =");
    expect(scene).toContain("while (t.length && active && visible && !F && !D && !s.aborted)");
    expect(scene).toContain("if (F || !active || !x.clientWidth || !x.clientHeight) return");
    expect(scene).toContain(
      "if (!active || !visible || F || !x.clientWidth || !x.clientHeight) return",
    );
  });
  it("rejects cancellation so an external entry cannot navigate afterward", async () => {
    const a = animationEnvironment(),
      controller = new AbortController(),
      painted: number[] = [];
    let navigated = false;
    const entry = runEntryTransition({
      duration: ZOOM_MS,
      signal: controller.signal,
      env: a.env,
      frame: (n: number) => painted.push(n),
    });
    const result = entry.then(() => {
      navigated = true;
    });
    a.advance(200);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    a.advance(900);
    expect(painted).toEqual([200 / ZOOM_MS]);
    expect(navigated).toBe(false);
    expect(a.frames.size + a.timers.size).toBe(0);
  });
  it("rejects already-cancelled entry before painting", async () => {
    const a = animationEnvironment(),
      controller = new AbortController(),
      painted: number[] = [];
    controller.abort();
    await expect(
      runEntryTransition({
        duration: ZOOM_MS,
        signal: controller.signal,
        env: a.env,
        frame: (n: number) => painted.push(n),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(painted).toEqual([]);
    expect(a.frames.size + a.timers.size).toBe(0);
  });
  it("settles once on resize, visibility loss, reduced motion or lost RAF", async () => {
    for (const reason of ["resize", "hide", "timeout", "reduced"]) {
      const a = animationEnvironment(),
        painted: number[] = [];
      const done = runEntryTransition({
        duration: reason === "reduced" ? 0 : ZOOM_MS,
        env: a.env,
        frame: (n: number) => painted.push(n),
      });
      if (reason === "resize") a.resize();
      if (reason === "hide") a.hide();
      if (reason === "timeout") [...a.timers.values()].forEach((callback) => callback());
      await done;
      a.advance(1000);
      a.resize();
      expect(painted).toEqual([1]);
      expect(a.frames.size + a.timers.size).toBe(0);
    }
  });
});

describe("Konami source and landing geometry", () => {
  const bounds = { x0: 0.31, y0: 0.16, x1: 0.69, y1: 0.48 };
  it("keeps displayed pose while promoting a translated/scaled card", () => {
    const rect = { left: 55, top: 101, width: 400, height: 600 };
    const pose = { x: 30, y: 60, s: 120 };
    const result = entryViewportGeometry(rect, pose, 200, 300, 1200, 800);
    expect(result.from).toEqual({ x: 115, y: 221, s: 240 });
    expect(result.uniform).toBe(true);
    const node = { getBoundingClientRect: () => rect, style: {} };
    const appended: unknown[] = [];
    expect(
      promoteEntryCanvas(node, pose, 200, 300, {
        innerWidth: 1200,
        innerHeight: 800,
        document: { body: { append: (value: unknown) => appended.push(value) } },
      }),
    ).toEqual(result);
    expect(appended).toEqual([node]);
    expect(node.style).toMatchObject({
      position: "fixed",
      width: "1200px",
      height: "800px",
      pointerEvents: "none",
      transform: "none",
    });
  });
  it("keeps mobile promotion CSS equal to the measured drawing viewport", () => {
    for (const height of [568, 724, 844]) {
      const node = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 393, height: 724 }),
        style: {} as Record<string, string>,
      };
      const pose = { x: 43.23, y: 214, s: 306.54 };
      const promoted = promoteEntryCanvas(node, pose, 393, 724, {
        innerWidth: 393,
        innerHeight: height,
        document: { body: { append() {} } },
      });
      expect(promoted.from).toEqual(pose);
      expect(Number.parseFloat(node.style.width)).toBe(promoted.width);
      expect(Number.parseFloat(node.style.height)).toBe(promoted.height);
      expect(node.style.height.endsWith("px")).toBe(true);
    }
  });
  it("detects rotation, perspective and nonuniform transforms", () => {
    for (const transform of [
      "matrix(1, .1, 0, 1, 0, 0)",
      "matrix(1, 0, 0, 2, 0, 0)",
      "matrix3d(1,0,0,0)",
    ]) {
      const node = { parentElement: null, transform };
      expect(
        hasComplexEntryTransform(node, {
          document: { body: {} },
          getComputedStyle: (value: typeof node) => value,
        }),
      ).toBe(true);
    }
    expect(
      entryViewportGeometry(
        { left: 0, top: 0, width: 200, height: 400 },
        { x: 0, y: 0, s: 100 },
        200,
        200,
        800,
        600,
      ).uniform,
    ).toBe(false);
  });
  it("covers both portrait and desktop viewports for full-UV external previews", () => {
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ]) {
      const target = entryCoverTarget(bounds, width, height);
      const left = target.x + bounds.x0 * target.s,
        right = target.x + bounds.x1 * target.s;
      const top = target.y + bounds.y0 * target.s,
        bottom = target.y + bounds.y1 * target.s;
      expect(left).toBeLessThanOrEqual(0.00001);
      expect(right).toBeGreaterThanOrEqual(width - 0.00001);
      expect(top).toBeLessThanOrEqual(0.00001);
      expect(bottom).toBeGreaterThanOrEqual(height - 0.00001);
    }
  });
  it("lands the original green page box exactly on the live viewport", () => {
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
      [2560, 1440],
    ]) {
      const box = portfolioPageBox(bounds, width, height),
        target = entryPortfolioTarget(bounds, width, height);
      const bw = bounds.x1 - bounds.x0,
        bh = bounds.y1 - bounds.y0;
      expect(target.x + (bounds.x0 + (0.5 - box.w / 2) * bw) * target.s).toBeCloseTo(0, 7);
      expect(target.y + (bounds.y0 + (0.5 - box.h / 2) * bh) * target.s).toBeCloseTo(0, 7);
      expect(box.w * bw * target.s).toBeCloseTo(width, 7);
      expect(box.h * bh * target.s).toBeCloseTo(height, 7);
      const page = { naturalWidth: width * 2, naturalHeight: height * 6, cssWidth: width };
      const sample = portfolioRasterSample(bounds, width, height, page);
      expect(sample[0] + sample[2] * 0.5).toBeCloseTo(0.5, 7);
      expect(sample[1] + sample[3] * 0.5).toBeCloseTo(1 / 6, 7);
    }
  });
  it("keeps live green capture and limits selected external runtime dependencies", () => {
    const screen = source("konami-screen-source.js"),
      scene = source("konami-computer-scene.js"),
      canvas = source("konami-canvas-scene.js");
    expect(screen).toContain("return capturePortfolio({ signal, maxTextureSize })");
    expect(screen).not.toContain("portfolio.jpg");
    expect(scene).toContain("vec2 p = (uv - .5) / uPage.xy");
    expect(scene).toContain("entryPortfolioTarget(bounds, U, k)");
    expect(scene).toContain("if (!D && visible)");
    expect(scene).toContain("options.initiallyVisible !== false");
    expect(canvas).toContain('const inflatable = kind === "scout"');
    expect(scene).toContain('if (kind === "scout")');
    expect(canvas).toContain("fadeCanvasToPreview");
    expect(canvas).not.toContain('plate = document.createElement("canvas")');
    for (const text of [scene, canvas, source("inflatable-registration.js")]) {
      expect(text).not.toMatch(
        /mountScoutImage|original-reference|case-treatments|scout-front-clear|scout-front-amber|computer:explode/,
      );
    }
  });
});

describe("selected media closure", () => {
  it("ships exactly the audited cases, two public pages and camera geometry", () => {
    let bytes = 0,
      count = 0;
    for (const bank of ["references-chrome-baked"]) {
      const folder = new URL(`models/${bank}/frames/`, root),
        files = readdirSync(folder);
      expect(files.length).toBe(57);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 19; col++) {
          const file = `case-${row}-${col}.webp`;
          expect(files).toContain(file);
          bytes += readFileSync(new URL(file, folder)).length;
          count++;
          expect(
            existsSync(new URL(`models/ivory-classic/frames/glass-${row}-${col}.webp`, root)),
          ).toBe(true);
        }
    }
    for (const file of [
      "../previews/scout-header-only.jpg",
      "../previews/references-tall.jpg",
      "shared-screen-center.json",
      "models/scout-inflatable-v1/case.png",
    ]) {
      bytes += readFileSync(new URL(file, root)).length;
      count++;
    }
    expect(count).toBe(61);
    expect(bytes).toBe(17583344);
    expect(
      createHash("sha256")
        .update(readFileSync(new URL("shared-screen-center.json", root)))
        .digest("hex"),
    ).toBe("b986ef6c3ecf279a7031d0cc0b896798cc30bbb10e6ffe6557a6679768cb877c");
  });
});
