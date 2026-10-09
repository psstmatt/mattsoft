import { describe, expect, it } from "bun:test";
import {
  createPreviewTimeline,
  previewScroll,
  fadeCanvasToPreview,
} from "../public/experience/konami-transition.js";
import {
  previewSourceDimensions,
  previewSampleHeight,
} from "../public/experience/konami-screen-source.js";
import {
  mountCanvasComputer,
  portfolioCasePixel,
} from "../public/experience/konami-canvas-scene.js";

// Tiny software canvas: real source sampling and compositing run in the renderer,
// while browser scheduling is controlled so pause/resume assertions are exact.
function previewEnvironment({ sourceHeight = 48, reducedMotion = false } = {}) {
  let now = 0,
    id = 0;
  const frames = new Map(),
    rasters = [],
    created = [];
  class Canvas {
    width = 8;
    height = 8;
    style = {};
    pixels = new Uint8ClampedArray(8 * 8 * 4);
    context = new Context(this);
    getContext() {
      return this.context;
    }
    setAttribute() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 390, height: 844 };
    }
    remove() {
      this.removed = true;
    }
  }
  class Context {
    draws = [];
    globalAlpha = 1;
    globalCompositeOperation = "source-over";
    constructor(canvas) {
      this.canvas = canvas;
    }
    ensure() {
      const { canvas } = this;
      if (canvas.pixels.length !== canvas.width * canvas.height * 4)
        canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      return canvas.pixels;
    }
    createImageData(width, height) {
      return { width, height, data: new Uint8ClampedArray(width * height * 4) };
    }
    getImageData(x, y, width, height) {
      const data = new Uint8ClampedArray(width * height * 4),
        source = this.ensure();
      for (let row = 0; row < height; row++)
        for (let col = 0; col < width; col++) {
          const from = ((row + y) * this.canvas.width + col + x) * 4;
          data.set(source.subarray(from, from + 4), (row * width + col) * 4);
        }
      return { width, height, data };
    }
    putImageData(image) {
      this.canvas.pixels = image.data.slice();
      rasters.push(image.data.slice());
    }
    drawImage(source, ...args) {
      this.draws.push(args);
      const [dx, dy, dw = source.width, dh = source.height] = args;
      const pixels = this.ensure(),
        src = source.pixels;
      if (!src) return;
      for (let y = Math.max(0, Math.ceil(dy)); y < Math.min(this.canvas.height, dy + dh); y++)
        for (let x = Math.max(0, Math.ceil(dx)); x < Math.min(this.canvas.width, dx + dw); x++) {
          const sx = Math.min(source.width - 1, Math.floor(((x - dx) / dw) * source.width));
          const sy = Math.min(source.height - 1, Math.floor(((y - dy) / dh) * source.height));
          const from = (sy * source.width + sx) * 4,
            to = (y * this.canvas.width + x) * 4;
          const alpha = (src[from + 3] / 255) * this.globalAlpha;
          if (this.globalCompositeOperation === "destination-out") {
            pixels[to + 3] *= 1 - alpha;
            continue;
          }
          for (let channel = 0; channel < 3; channel++)
            pixels[to + channel] = src[from + channel] * alpha + pixels[to + channel] * (1 - alpha);
          pixels[to + 3] = 255 * alpha + pixels[to + 3] * (1 - alpha);
        }
    }
    clearRect() {
      this.ensure().fill(0);
    }
    fillRect() {}
    setTransform() {}
    transform() {}
    clip() {}
    save() {}
    restore() {
      this.globalCompositeOperation = "source-over";
    }
    beginPath() {}
    moveTo() {}
    lineTo() {}
    closePath() {}
    fill() {}
    fillText() {}
  }
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { classList: { contains: () => false } },
    body: {
      append(node) {
        created.push(node);
      },
    },
    createElement() {
      return new Canvas();
    },
  });
  const reduced = Object.assign(new EventTarget(), { matches: reducedMotion });
  const bitmap = { width: 16, height: sourceHeight, close() {} };
  bitmap.pixels = new Uint8ClampedArray(bitmap.width * bitmap.height * 4);
  for (let y = 0; y < bitmap.height; y++)
    for (let x = 0; x < bitmap.width; x++)
      bitmap.pixels.set([y * 4, x * 8, 240 - y * 4, 255], (y * bitmap.width + x) * 4);
  const meta = {
    width: 8,
    frame: {
      screenMesh: [
        [0, 0],
        [8, 0],
        [0, 8],
        [8, 8],
      ],
      screenQuad: [
        [0, 0],
        [8, 0],
        [8, 8],
        [0, 8],
      ],
    },
    topology: {
      uv: [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      triangles: [
        [0, 1, 2],
        [1, 3, 2],
      ],
    },
  };
  const env = {
    document,
    performance: { now: () => now },
    innerWidth: 390,
    innerHeight: 844,
    devicePixelRatio: 1,
    matchMedia: () => reduced,
    requestAnimationFrame(callback) {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame(key) {
      frames.delete(key);
    },
    createImageBitmap: async () => bitmap,
    fetch: async () => ({ ok: true, json: async () => meta, blob: async () => ({}) }),
    Image: class extends Canvas {
      naturalWidth = 8;
      naturalHeight = 8;
      async decode() {}
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  const stage = {
    clientWidth: 390,
    clientHeight: 844,
    append(node) {
      this.canvas = node;
    },
  };
  const button = { style: {} };
  const element = Object.assign(new EventTarget(), {
    dataset: { kind: "references" },
    style: { setProperty() {} },
    querySelector: (selector) => (selector.includes("stage") ? stage : button),
  });
  const saved = new Map(
    Object.keys(env).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  return {
    env,
    document,
    reduced,
    frames,
    rasters,
    created,
    element,
    stage,
    install() {
      for (const [key, value] of Object.entries(env))
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    },
    restore() {
      for (const [key, value] of saved)
        value ? Object.defineProperty(globalThis, key, value) : delete globalThis[key];
    },
    advance(value) {
      now = value;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(value));
    },
  };
}

describe("prepared preview motion", () => {
  it("softens the green case crop without fading its opaque body", () => {
    for (const dark of [false, true]) {
      expect(portfolioCasePixel(0.2, 0.7, 0.5, 1, 0.5, 0.5, dark)).toEqual([0.2, 0.7, 0.5, 1]);
      expect(portfolioCasePixel(0, 0, 0, 1, 0.5, 0.5, dark)[3]).toBe(1);
      expect(portfolioCasePixel(0, 0, 0, 0.5, 1, 0.5, dark)[3]).toBe(0);
      expect(portfolioCasePixel(0, 0, 0, 0, 0.5, 0.5, dark)[3]).toBe(0);
    }
    expect(portfolioCasePixel(0, 0, 0, 0.5, 0.94, 0.5)[3]).toBeCloseTo(0.25, 8);
    expect(portfolioCasePixel(0, 0, 0, 0.5, 0.5, 0.5, true)[3]).toBeCloseTo(0.275, 8);
    expect(portfolioCasePixel(0.7, 0.7, 0.7, 0.5, 0.5, 0.5, true)[3]).toBe(0.5);
  });
  it("uses active viewing time, excluding preloading and pauses", () => {
    const timeline = createPreviewTimeline();
    expect(timeline.elapsed(30000)).toBe(0);
    timeline.setRunning(true, 30000);
    expect(previewScroll(timeline.elapsed(35000), 0.6)).toBeGreaterThan(0.1);
    timeline.setRunning(false, 35000);
    expect(timeline.elapsed(90000)).toBe(5000);
    timeline.setRunning(true, 90000);
    expect(timeline.elapsed(92000)).toBe(7000);
    expect(previewScroll(7000, 0.6, true)).toBe(0);
  });
  it("preserves tall captures and keeps the public Scout header static", () => {
    expect(previewSourceDimensions(1188, 2168)).toEqual({ width: 1188, height: 2168, scale: 1 });
    const scaled = previewSourceDimensions(2000, 8000, 4096);
    expect(scaled.width).toBe(1024);
    expect(scaled.height).toBe(4096);
    const short = previewSourceDimensions(1150, 228);
    expect(
      previewSampleHeight(
        { naturalWidth: short.width, naturalHeight: short.height, cssWidth: 1150 },
        true,
        844,
      ),
    ).toBe(1);
    expect(
      previewSampleHeight({ naturalWidth: 1188, naturalHeight: 2168, cssWidth: 1188 }, true, 844),
    ).toBeCloseTo(0.428102, 5);
  });
  it("changes actual Canvas pixels, pauses inactive/hidden cards, and resumes without a jump", async () => {
    const test = previewEnvironment();
    test.install();
    let scene;
    try {
      scene = await mountCanvasComputer(test.element, new AbortController().signal);
      const first = scene.canvas.pixels.slice();
      test.advance(5000);
      const moved = scene.canvas.pixels.slice();
      expect(moved).not.toEqual(first);
      expect(Number(test.element.dataset.previewScroll)).toBeGreaterThan(0.1);
      const rasterCount = test.rasters.length;
      test.advance(5010);
      expect(test.rasters.length).toBe(rasterCount);
      scene.setActive(false);
      const paused = scene.canvas.pixels.slice(),
        offset = test.element.dataset.previewScroll;
      expect(test.frames.size).toBe(0);
      test.advance(100000);
      scene.setActive(true);
      expect(test.element.dataset.previewScroll).toBe(offset);
      expect(scene.canvas.pixels).toEqual(paused);
      test.advance(103000);
      expect(scene.canvas.pixels).not.toEqual(paused);
      test.document.hidden = true;
      test.document.dispatchEvent(new Event("visibilitychange"));
      expect(test.frames.size).toBe(0);
      test.advance(200000);
      test.document.hidden = false;
      test.document.dispatchEvent(new Event("visibilitychange"));
      expect(test.frames.size).toBe(1);
      test.reduced.matches = true;
      test.reduced.dispatchEvent(new Event("change"));
      expect(test.element.dataset.previewScroll).toBe("0.000000");
      expect(test.frames.size).toBe(0);
      expect(scene.canvas.pixels).toEqual(first);
      scene.dispose();
      expect(test.frames.size).toBe(0);
    } finally {
      scene?.dispose();
      test.restore();
    }
  });
  it("does not schedule pretend motion for a single-screen source", async () => {
    const test = previewEnvironment({ sourceHeight: 4 });
    test.install();
    let scene;
    try {
      scene = await mountCanvasComputer(test.element, new AbortController().signal);
      expect(test.frames.size).toBe(0);
      expect(test.element.dataset.previewScroll).toBe("0.000000");
    } finally {
      scene?.dispose();
      test.restore();
    }
  });
  it("starts a prepared hidden card at its first frame when it becomes active and visible", async () => {
    const test = previewEnvironment();
    test.install();
    let scene;
    try {
      scene = await mountCanvasComputer(test.element, new AbortController().signal, {
        initiallyVisible: false,
      });
      scene.setActive(false);
      test.advance(90000);
      expect(test.frames.size).toBe(0);
      scene.setActive(true);
      expect(test.frames.size).toBe(0);
      scene.setVisible(true);
      expect(test.element.dataset.previewScroll).toBe("0.000000");
      expect(test.frames.size).toBe(1);
      test.advance(95000);
      expect(Number(test.element.dataset.previewScroll)).toBeGreaterThan(0.1);
      scene.setVisible(false);
      expect(test.frames.size).toBe(0);
    } finally {
      scene?.dispose();
      test.restore();
    }
  });
  for (const kind of ["scout", "references"]) {
    it(`animates ${kind} into its screen before the fitted destination handoff`, async () => {
      const test = previewEnvironment();
      test.element.dataset.kind = kind;
      test.install();
      let scene;
      try {
        scene = await mountCanvasComputer(test.element, new AbortController().signal);
        const visible = test.stage.canvas;
        let finished = false;
        const entry = scene.enter({ style: {} }).then(() => {
          finished = true;
        });
        const firstSize = visible.context.draws.at(-1)[2];
        expect(visible.style.position).toBe("fixed");
        expect(test.created).toContain(visible);
        test.advance(350);
        await Promise.resolve();
        expect(visible.context.draws.at(-1)[2]).toBeGreaterThan(firstSize);
        expect(finished).toBe(false);
        expect(test.created).toHaveLength(1); // No full-page plate replacing the zoom.
        test.advance(700);
        await Promise.resolve();
        expect(test.created).toHaveLength(2);
        const plate = test.created.at(-1);
        expect(plate.style.opacity).toBe("0");
        test.advance(810);
        expect(Number(plate.style.opacity)).toBeCloseTo(0.5, 5);
        expect(finished).toBe(false);
        test.advance(920);
        await entry;
        expect(finished).toBe(true);
        expect(plate.style.opacity).toBe("1");
      } finally {
        scene?.dispose();
        test.restore();
      }
    });
  }
  it("fits the complete external preview width during portrait handoff", async () => {
    const test = previewEnvironment({ reducedMotion: true });
    const calls = [];
    const source = { width: 1188, height: 2168 };
    const plate = {
      style: {},
      getContext: () => ({
        fillRect() {},
        drawImage(...args) {
          calls.push(args);
        },
      }),
      remove() {},
    };
    const env = {
      ...test.env,
      setTimeout,
      clearTimeout,
      document: {
        ...test.env.document,
        hidden: false,
        addEventListener() {},
        removeEventListener() {},
        createElement: () => plate,
      },
    };
    await fadeCanvasToPreview({}, source, undefined, env);
    expect(calls.at(-1)).toEqual([source, 0, 0, 390, (2168 * 390) / 1188]);
    expect(plate.style.opacity).toBe("1");
    expect(plate.style.transform).toBeUndefined();
  });
});
