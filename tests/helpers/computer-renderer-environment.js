// Browser boundaries are stubbed; renderer setup, pose math and scheduling run
// unchanged so lifecycle failures cannot silently pass as a Canvas fallback.
export function rendererEnvironment({
  kind = "references",
  fine = true,
  reduced = false,
  factory = true,
  tall = false,
} = {}) {
  let now = 0,
    id = 0;
  const frames = new Map(),
    timers = new Map(),
    observers = [],
    uniforms = new Map();
  const windowEvents = new EventTarget();
  const fineMedia = Object.assign(new EventTarget(), { matches: fine });
  const reducedMedia = Object.assign(new EventTarget(), { matches: reduced });
  const rect = { left: 20, top: 40, width: 1200, height: 900 };
  const gl = new Proxy(
    {
      getParameter: () => 4096,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getExtension: () => null,
      getUniformLocation: (_, name) => name,
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        if (/^[A-Z_0-9]+$/.test(key)) return 1;
        if (key.startsWith("create")) return () => ({});
        if (key.startsWith("uniform")) return (name, ...values) => uniforms.set(name, values);
        return () => {};
      },
    },
  );
  function context(canvas) {
    return new Proxy(
      {
        canvas,
        draws: [],
        transforms: [],
        globalAlpha: 1,
        drawImage(source, ...args) {
          this.draws.push({ source, args, alpha: this.globalAlpha });
        },
        transform(...matrix) {
          this.transforms.push(matrix);
        },
        createImageData: (width, height) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        }),
        getImageData: (_, __, width, height) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4).fill(255),
        }),
        createRadialGradient: () => ({ addColorStop() {} }),
        createLinearGradient: () => ({ addColorStop() {} }),
      },
      {
        get(target, key) {
          return key in target ? target[key] : () => {};
        },
      },
    );
  }
  const style = () => ({
    setProperty(name, value) {
      this[name] = value;
    },
    removeProperty(name) {
      delete this[name];
    },
  });
  class Canvas extends EventTarget {
    width = 16;
    height = 16;
    style = style();
    context = context(this);
    naturalWidth = 16;
    naturalHeight = 16;
    getContext(type) {
      return type === "webgl2" ? gl : this.context;
    }
    getBoundingClientRect() {
      return rect;
    }
    setAttribute() {}
    remove() {
      this.removed = true;
    }
    async decode() {}
  }
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    fonts: { load: async () => [] },
    documentElement: Object.assign(new EventTarget(), {
      classList: { contains: () => false },
      clientWidth: 1200,
    }),
    body: { append() {} },
    createElement: () => new Canvas(),
    querySelector: () => null,
  });
  const button = Object.assign(new EventTarget(), { style: style(), matches: () => false });
  const stage = {
    clientWidth: 1200,
    clientHeight: 900,
    append(canvas) {
      this.canvas = canvas;
    },
    getBoundingClientRect: () => rect,
  };
  const element = Object.assign(new EventTarget(), {
    dataset: { kind, focusStyle: factory ? "factory" : "" },
    style: style(),
    querySelector(selector) {
      return selector.includes("stage") ? stage : selector.includes("enter") ? button : null;
    },
  });
  const meta = {
    width: 16,
    frame: {
      screenMesh: [
        [4, 3],
        [12, 3],
        [4, 11],
        [12, 11],
      ],
      screenQuad: [
        [4, 3],
        [12, 3],
        [12, 11],
        [4, 11],
      ],
    },
    topology: {
      columns: 2,
      rows: 2,
      boundaryVertexIndices: [0, 1, 3, 2],
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
    innerWidth: 1200,
    innerHeight: 900,
    devicePixelRatio: 1,
    performance: { now: () => now },
    getComputedStyle: () => ({ fontFamily: "sans-serif", transform: "none" }),
    matchMedia: (query) =>
      query.includes("reduced")
        ? reducedMedia
        : query.includes("fine")
          ? fineMedia
          : { matches: false },
    requestAnimationFrame(callback) {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame(key) {
      frames.delete(key);
    },
    setTimeout(callback) {
      timers.set(++id, callback);
      return id;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    Image: class extends Canvas {
      set src(value) {
        this.source = value;
        if (kind === "references") {
          const size = value.includes("references-chrome-baked")
            ? 1024
            : value.includes("glass-")
              ? 480
              : 960;
          this.naturalWidth = this.naturalHeight = size;
        }
      }
      get src() {
        return this.source;
      }
    },
    createImageBitmap: async () => ({ width: 16, height: tall ? 48 : 8, close() {} }),
    fetch: async () => ({ ok: true, json: async () => meta, blob: async () => ({}) }),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
  };
  env.window = env;
  const saved = new Map(
    Object.keys(env).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  return {
    env,
    element,
    stage,
    button,
    document,
    frames,
    timers,
    uniforms,
    fineMedia,
    reducedMedia,
    observers,
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
    move(x, y, pointerType = "mouse") {
      element.dispatchEvent(
        Object.assign(new Event("pointermove"), {
          clientX: x + rect.left,
          clientY: y + rect.top,
          pointerType,
        }),
      );
    },
    blur() {
      windowEvents.dispatchEvent(new Event("blur"));
    },
    intersect(value) {
      observers.forEach((observer) => observer.callback([{ isIntersecting: value }]));
    },
  };
}
