import { describe, expect, it } from "bun:test";
import {
  captureDimensions,
  loadedStylesheets,
  inlineStylesheets,
  validateCaptureStyles,
  awaitCaptureReady,
} from "../public/experience/computer-snapshot.js";
import {
  previewScroll,
  runEntryTransition,
  fadeToPortfolio,
  ZOOM_MS,
  FADE_MS,
} from "../public/experience/computer-transition.js";

function animationEnvironment() {
  let now = 0,
    next = 0;
  const frames = new Map<number, (n: number) => void>();
  const timers = new Map<number, () => void>();
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { classList: { add() {} } },
  });
  const windowEvents = new EventTarget();
  const env = {
    document,
    performance: { now: () => now },
    requestAnimationFrame: (cb: (n: number) => void) => {
      frames.set(++next, cb);
      return next;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    setTimeout: (cb: () => void) => {
      timers.set(++next, cb);
      return next;
    },
    clearTimeout: (id: number) => timers.delete(id),
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  };
  return {
    env,
    frames,
    timers,
    advance(time: number) {
      now = time;
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((cb) => cb(time));
    },
    hide() {
      document.hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    resize() {
      windowEvents.dispatchEvent(new Event("resize"));
    },
  };
}

describe("prepared styled screen capture", () => {
  it("copies the already loaded CSS in order without flattening layers or font rules", () => {
    const links = [
      {
        href: "https://preview.test/app.css",
        media: "",
        sheet: {
          cssRules: [
            { cssText: '@layer base { body { font-family: "Work Sans"; } }' },
            {
              cssText: '@font-face { font-family: "Work Sans"; src: url(/fonts/work.ttf); }',
            },
          ],
        },
      },
      {
        href: "https://preview.test/motion.css",
        media: "screen",
        sheet: { cssRules: [{ cssText: ".screen { opacity: 1; }" }] },
      },
    ];
    const source = {
      baseURI: "https://preview.test/",
      querySelectorAll: () => links,
    };
    const sheets = loadedStylesheets(source);
    const replacements: { textContent: string; media: string }[] = [];
    const clone = {
      querySelectorAll: () =>
        links.map((link, index) => ({
          ...link,
          replaceWith: (style: { textContent: string; media: string }) => {
            replacements[index] = style;
          },
        })),
      createElement: () => ({ textContent: "", media: "" }),
    };
    inlineStylesheets(clone, sheets);
    expect(replacements[0].textContent).toBe(
      links[0].sheet.cssRules.map((r) => r.cssText).join("\n"),
    );
    expect(replacements[1].media).toBe("screen");
  });
  it("rejects a stylesheet which has not loaded instead of capturing unstyled HTML", () => {
    expect(() =>
      loadedStylesheets({
        baseURI: "https://preview.test/",
        querySelectorAll: () => [{ href: "https://preview.test/app.css", sheet: null }],
      }),
    ).toThrow("not ready");
  });
  it("rejects the observed unstyled heading, font and collapsed layout", () => {
    const expected = {
      fontFamily: '"Work Sans", sans-serif',
      navigationDisplay: "flex",
      wrapperWidth: 680,
      wrapperLeft: 100,
    };
    const hidden = {
      style: { position: "absolute", width: "1px", height: "1px" },
    };
    const nav = { style: { display: "flex" } };
    const wrapper = { getBoundingClientRect: () => ({ width: 680, left: 100 }) };
    const doc = {
      body: { style: { fontFamily: expected.fontFamily } },
      defaultView: {
        getComputedStyle: (element: { style: Record<string, string> }) => element.style,
      },
      querySelector: (selector: string) =>
        selector === "h1.sr-only" ? hidden : selector === "main > div" ? wrapper : nav,
    };
    expect(() => validateCaptureStyles(doc, expected)).not.toThrow();
    hidden.style.position = "static";
    expect(() => validateCaptureStyles(doc, expected)).toThrow("does not match");
    hidden.style.position = "absolute";
    doc.body.style.fontFamily = "Times New Roman";
    expect(() => validateCaptureStyles(doc, expected)).toThrow();
    doc.body.style.fontFamily = expected.fontFamily;
    wrapper.getBoundingClientRect = () => ({ width: 1200, left: 100 });
    expect(() => validateCaptureStyles(doc, expected)).toThrow();
  });
  it("bounds portrait and desktop textures to the device texture size", () => {
    for (const [width, height, page] of [
      [390, 844, 8000],
      [1368, 768, 7000],
      [2560, 1440, 10000],
    ]) {
      const d = captureDimensions(width, height, page, 3, 4096);
      expect(d.height).toBeLessThanOrEqual(height * 3);
      expect(d.width * d.scale).toBeLessThanOrEqual(4096);
      expect(d.height * d.scale).toBeLessThanOrEqual(4096);
    }
  });
  it("allows ready fonts, cancels early entry, and rejects stalled capture", async () => {
    expect(await awaitCaptureReady(Promise.resolve("ready"))).toBe("ready");
    const controller = new AbortController();
    const cancelled = awaitCaptureReady(new Promise(() => {}), controller.signal);
    controller.abort();
    await expect(cancelled).rejects.toThrow("cancelled");
    await expect(awaitCaptureReady(new Promise(() => {}), undefined, 5)).rejects.toThrow(
      "not ready",
    );
  });
});

describe("production entry and scrolling", () => {
  it("holds the hero, slowly scrolls down and returns, without moving reduced-motion previews", () => {
    expect(previewScroll(1200, 0.6)).toBe(0);
    expect(previewScroll(8200, 0.6)).toBeCloseTo(0.3);
    expect(previewScroll(15200, 0.6)).toBeCloseTo(0.6);
    expect(previewScroll(29200, 0.6)).toBeCloseTo(0);
    expect(previewScroll(15200, 0.6, true)).toBe(0);
  });
  it("settles the zoom once and clears its animation work", async () => {
    const a = animationEnvironment(),
      rendered: number[] = [];
    const done = runEntryTransition({
      duration: ZOOM_MS,
      frame: (n: number) => rendered.push(n),
      env: a.env,
    });
    a.advance(350);
    a.advance(700);
    await done;
    expect(rendered).toEqual([0.5, 1]);
    expect(a.frames.size + a.timers.size).toBe(0);
    a.hide();
    expect(rendered).toEqual([0.5, 1]);
  });
  it("app switching completes entry instead of resuming the idle loop", async () => {
    const a = animationEnvironment(),
      rendered: number[] = [];
    const done = runEntryTransition({
      duration: ZOOM_MS,
      frame: (n: number) => rendered.push(n),
      env: a.env,
    });
    a.advance(200);
    a.hide();
    await done;
    expect(rendered.at(-1)).toBe(1);
    expect(a.frames.size + a.timers.size).toBe(0);
  });
  it("toolbar resize settles without rendering stale geometry", async () => {
    const a = animationEnvironment(),
      rendered: number[] = [];
    const done = runEntryTransition({
      duration: ZOOM_MS,
      frame: (n: number) => rendered.push(n),
      env: a.env,
    });
    a.advance(200);
    a.resize();
    await done;
    expect(rendered).toEqual([200 / ZOOM_MS]);
    expect(a.frames.size + a.timers.size).toBe(0);
  });
  it("unmount cancellation never paints into a disposed context", async () => {
    const a = animationEnvironment(),
      controller = new AbortController(),
      rendered: number[] = [];
    const done = runEntryTransition({
      duration: ZOOM_MS,
      signal: controller.signal,
      frame: (n: number) => rendered.push(n),
      env: a.env,
    });
    controller.abort();
    await done;
    a.advance(700);
    expect(rendered).toEqual([]);
  });
  it("a lost RAF cannot trap the portfolio", async () => {
    const a = animationEnvironment(),
      rendered: number[] = [];
    const done = runEntryTransition({
      duration: ZOOM_MS,
      frame: (n: number) => rendered.push(n),
      env: a.env,
    });
    [...a.timers.values()].forEach((cb) => cb());
    await done;
    expect(rendered).toEqual([1]);
  });
  it("fade clears the overlay and restores portfolio opacity", async () => {
    const a = animationEnvironment(),
      overlay = { style: { opacity: "1" } },
      surface = { style: { opacity: "" } };
    const done = fadeToPortfolio(overlay, surface, undefined, a.env);
    a.advance(FADE_MS / 2);
    expect(overlay.style.opacity).toBe("0.5");
    expect(surface.style.opacity).toBe("0.5");
    a.advance(FADE_MS);
    await done;
    expect(overlay.style.opacity).toBe("0");
    expect(surface.style.opacity).toBe("");
  });
});
