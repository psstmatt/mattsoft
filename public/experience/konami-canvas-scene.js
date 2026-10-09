import { captureScreenSource, previewSampleHeight } from "./konami-screen-source.js?v=24";
import { applyComputerLayout } from "./konami-layout.js";
import { awaitCaptureReady } from "./computer-snapshot.js";
import { greenPlastic } from "./computer-material.js";
import { rasterPreview } from "./konami-raster.js?v=24";
import {
  INFLATABLE_ASSET,
  inflatableScreenGeometry,
  inflatablePose,
  fitInflatableGlass,
} from "./inflatable-registration.js";
import {
  fadeCanvasToPreview,
  fadeToPortfolio,
  portfolioPageBox,
  previewScroll,
  createPreviewTimeline,
} from "./konami-transition.js?v=24";

const ROOT = "/experience/models/ivory-classic/frames/";
export function portfolioCasePixel(red, green, blue, alpha, u, v, dark = false) {
  const colour = greenPlastic(red, green, blue);
  const smooth = (value) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  // Match the WebGL case shader: soften the cropped studio-shadow border and
  // reduce its opacity on a dark page, leaving opaque plastic and trim intact.
  const feather = smooth(Math.min(u, v, 1 - u, 1 - v) / 0.12);
  const shadow = (1 - smooth(Math.max(...colour) / 0.04)) * (alpha < 0.995 ? 1 : 0);
  return [...colour, alpha * feather * (1 - shadow * 0.45 * Number(dark))];
}

function cue(data) {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 700;
  const x = c.getContext("2d"),
    matched = data.matched || 0;
  const keys = (data.history || []).slice(-10);
  x.fillStyle = "#e6eee1";
  x.fillRect(0, 0, 900, 700);
  x.fillStyle = "#1b3324";
  x.textAlign = "center";
  x.font = "bold 44px monospace";
  x.fillText(data.unlocked ? "SECRET UNLOCKED" : data.move || "INPUT DETECTED", 450, 75);
  x.font = "bold 150px monospace";
  x.fillText(keys.at(-1) || "", 450, 255);
  keys.forEach((key, i) => {
    const row = Math.floor(i / 5),
      count = Math.min(5, keys.length - row * 5);
    const left = (900 - count * 144 + 20) / 2 + (i % 5) * 144,
      top = 305 + row * 130;
    const good = i >= keys.length - matched;
    x.fillStyle = good ? "#315d3a" : "#cfc8b7";
    x.fillRect(left, top, 124, 108);
    x.fillStyle = good ? "#fff" : "#1b3324";
    x.font = "bold 76px monospace";
    x.fillText(key, left + 62, top + 80);
  });
  x.fillStyle = "#1b3324";
  x.font = "bold 39px monospace";
  x.fillText(
    data.unlocked
      ? "PICK YOUR WORLD"
      : `${matched} / ${data.total || 10}  ${matched ? "COMBO" : "KEEP GOING"}`,
    450,
    645,
  );
  return c;
}

export function portfolioRasterSample(bounds, width, height, page, scroll = 0) {
  const aspect = portfolioPageBox(bounds, width, height);
  const pageHeight = (page.naturalHeight * page.cssWidth) / page.naturalWidth;
  const scaleX = width / page.cssWidth,
    scaleY = height / pageHeight;
  return [
    0.5 - (0.5 / aspect.w) * scaleX,
    scroll + (0.5 - 0.5 / aspect.h) * scaleY,
    scaleX / aspect.w,
    scaleY / aspect.h,
  ];
}

export async function mountCanvasComputer(
  element,
  signal,
  { initiallyVisible = true } = {},
) {
  const stage = element.querySelector("[data-computer-stage]");
  const button = element.querySelector("[data-computer-enter]");
  const kind = element.dataset.kind || "portfolio";
  const inflatable = kind === "scout";
  if (!stage || !button) throw new Error("Computer stage or entry button missing");
  if (!["portfolio", "scout", "references"].includes(kind))
    throw new Error("Unknown computer destination");
  const local = new AbortController(),
    abort = () => local.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) local.abort(signal.reason);
  const s = local.signal;
  let disposed = false,
    entering = false,
    active = true,
    visible = initiallyVisible,
    resize,
    animationFrame = 0,
    lastPaint = 0,
    lastScroll = -1;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    previewTimeline = createPreviewTimeline();
  let layout,
    canvas,
    plate,
    overlay,
    page,
    meta,
    body,
    darkBody,
    themeObserver,
    coverage,
    glass,
    composite,
    dirty = true;
  let previousWidth = 0,
    previousHeight = 0;
  const images = [];
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    previewTimeline.setRunning(false, performance.now());
    local.abort();
    signal?.removeEventListener("abort", abort);
    resize?.disconnect();
    themeObserver?.disconnect();
    canvas?.remove();
    plate?.remove();
    for (const image of images) image.src = "";
  };
  s.addEventListener("abort", dispose, { once: true });
  async function image(src) {
    s.throwIfAborted();
    const im = new Image();
    images.push(im);
    im.src = src;
    await awaitCaptureReady(im.decode(), s, 12000);
    s.throwIfAborted();
    return im;
  }
  try {
    s.throwIfAborted();
    const caseFile = inflatable
      ? INFLATABLE_ASSET
      : kind === "references"
          ? "/experience/models/references-chrome-baked/frames/case-1-9.webp"
          : ROOT + "case-1-9.webp";
    const response = await awaitCaptureReady(
      fetch("/experience/shared-screen-center.json", { signal: s }),
      s,
      12000,
    );
    if (!response.ok) throw new Error("Shared screen geometry unavailable");
    meta = await response.json();
    [body, coverage, glass, page] = await Promise.all([
      image(caseFile),
      image(ROOT + "case-1-9.webp"),
      image(ROOT + "glass-1-9.webp"),
      captureScreenSource({ signal: s, kind }),
    ]);
    s.throwIfAborted();
    if (inflatable) {
      const originalMeta = meta;
      meta = inflatableScreenGeometry(originalMeta);
      glass = fitInflatableGlass(glass, originalMeta, meta);
      coverage = body;
    }
    if (kind === "portfolio") {
      function preparePortfolioBody(dark) {
        const prepared = document.createElement("canvas");
        prepared.width = body.naturalWidth;
        prepared.height = body.naturalHeight;
        const context = prepared.getContext("2d");
        context.drawImage(body, 0, 0);
        const pixels = context.getImageData(0, 0, prepared.width, prepared.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          if (!pixels.data[i + 3]) continue;
          const pixel = i / 4;
          const colour = portfolioCasePixel(
            pixels.data[i] / 255,
            pixels.data[i + 1] / 255,
            pixels.data[i + 2] / 255,
            pixels.data[i + 3] / 255,
            ((pixel % prepared.width) + 0.5) / prepared.width,
            (Math.floor(pixel / prepared.width) + 0.5) / prepared.height,
            dark,
          );
          for (let channel = 0; channel < 4; channel++)
            pixels.data[i + channel] = Math.round(colour[channel] * 255);
        }
        context.putImageData(pixels, 0, 0);
        return prepared;
      }
      darkBody = preparePortfolioBody(true);
      body = preparePortfolioBody(false);
    }
    overlay = page;
    canvas = document.createElement("canvas");
    canvas.className = "computer-canvas-fallback";
    canvas.style.visibility = visible ? "visible" : "hidden";
    canvas.setAttribute("aria-hidden", "true");
    stage.append(canvas);
    const make = () => {
      const c = document.createElement("canvas");
      c.width = c.height = meta.width;
      return c;
    };
    composite = make();
    const screen = make(),
      reflection = make();
    const points = meta.frame.screenBoundary || meta.frame.screenQuad;
    const xs = meta.frame.screenMesh.map((p) => p[0] / meta.width);
    const ys = meta.frame.screenMesh.map((p) => p[1] / meta.width);
    const bounds = {
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...xs),
      y1: Math.max(...ys),
    };
    function rebuild(width, height, scroll) {
      const n = meta.width,
        x = screen.getContext("2d");
      x.clearRect(0, 0, n, n);
      const sample =
        kind === "portfolio" && overlay === page
          ? portfolioRasterSample(bounds, width, height, page, scroll)
          : overlay === page
            ? [0, scroll, 1, previewSampleHeight(page, true, height)]
            : undefined;
      rasterPreview(x, overlay, meta.frame, meta.topology, n, sample);
      x.globalCompositeOperation = "destination-out";
      x.drawImage(coverage, 0, 0, n, n);
      x.globalCompositeOperation = "source-over";
      const g = reflection.getContext("2d");
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, n, n);
      g.drawImage(glass, 0, 0, n, n);
      g.globalCompositeOperation = "destination-in";
      g.drawImage(screen, 0, 0);
      const c = composite.getContext("2d");
      c.clearRect(0, 0, n, n);
      c.drawImage(screen, 0, 0);
      c.globalCompositeOperation = "screen";
      c.globalAlpha = 0.16;
      c.drawImage(reflection, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
      c.drawImage(
        darkBody && document.documentElement.classList.contains("dark") ? darkBody : body,
        0,
        0,
        n,
        n,
      );
      dirty = false;
    }
    function canAnimate() {
      return (
        !disposed &&
        !entering &&
        active &&
        visible &&
        !document.hidden &&
        !reduced.matches &&
        overlay === page &&
        previewSampleHeight(page, kind !== "portfolio", stage.clientHeight) < 1
      );
    }
    function schedule() {
      previewTimeline.setRunning(canAnimate(), performance.now());
      if (!animationFrame && canAnimate()) animationFrame = requestAnimationFrame(tick);
    }
    function tick(now) {
      animationFrame = 0;
      if (!canAnimate()) {
        previewTimeline.setRunning(false, now);
        return;
      }
      // Prepared page sampling is smooth at 20 fps without rasterizing a whole
      // desktop-sized computer on every phone display refresh.
      if (now - lastPaint >= 50) render(now);
      schedule();
    }
    function render(now = performance.now()) {
      if (disposed || entering) return;
      const w = stage.clientWidth,
        h = stage.clientHeight;
      if (!w || !h) return;
      previewTimeline.setRunning(canAnimate(), now);
      const scroll =
        overlay === page
          ? previewScroll(
              previewTimeline.elapsed(now),
              Math.max(0, 1 - previewSampleHeight(page, kind !== "portfolio", h)),
              reduced.matches,
            )
          : 0;
      if (scroll !== lastScroll) dirty = true;
      lastScroll = scroll;
      element.dataset.previewScroll = scroll.toFixed(6);
      if (kind === "portfolio" && (w !== previousWidth || h !== previousHeight)) dirty = true;
      previousWidth = w;
      previousHeight = h;
      if (dirty) rebuild(w, h, scroll);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      const x = canvas.getContext("2d");
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, w, h);
      const standardPose = applyComputerLayout(element, w, h),
        pose = inflatable ? inflatablePose(standardPose) : standardPose,
        size = pose.s;
      layout = { x: pose.x, y: pose.y, size };
      x.drawImage(composite, layout.x, layout.y, size, size);
      lastPaint = now;
      if (visible) {
        const px = points.map((p) => layout.x + (p[0] * size) / meta.width);
        const py = points.map((p) => layout.y + (p[1] * size) / meta.width);
        Object.assign(button.style, {
          left: `${Math.min(...px)}px`,
          top: `${Math.min(...py)}px`,
          width: `${Math.max(...px) - Math.min(...px)}px`,
          height: `${Math.max(...py) - Math.min(...py)}px`,
          clipPath: "",
        });
      }
      schedule();
    }
    if (darkBody) {
      let dark = document.documentElement.classList.contains("dark");
      themeObserver = new MutationObserver(() => {
        const current = document.documentElement.classList.contains("dark");
        if (current !== dark) {
          dark = current;
          dirty = true;
          render();
        }
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    const resume = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previewTimeline.setRunning(false, performance.now());
      render();
    };
    document.addEventListener("visibilitychange", resume, { signal: s });
    reduced.addEventListener("change", resume, { signal: s });
    resize = new ResizeObserver(() => render());
    resize.observe(stage);
    render();
    element.dataset.ready = "true";
    element.dataset.renderMode = "canvas";
    if (visible) element.dispatchEvent(new Event("computer-screen-on"));
    return {
      canvas,
      dispose,
      setActive(value) {
        if (disposed || entering || active === !!value) return;
        active = !!value;
        resume();
      },
      setVisible(value) {
        if (disposed || entering) return;
        visible = !!value;
        canvas.style.visibility = visible ? "visible" : "hidden";
        resume();
      },
      setInput(data = {}) {
        if (disposed || entering) return;
        // Each cue gets a fresh canvas so the raster pixel cache never sees stale content.
        overlay = data.history?.length && !data.preview ? cue(data) : page;
        dirty = true;
        render();
      },
      async enter(surface) {
        s.throwIfAborted();
        if (disposed || entering) throw new Error("Computer entry unavailable");
        overlay = page;
        dirty = true;
        render();
        entering = true;
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        previewTimeline.setRunning(false, performance.now());
        button.style.pointerEvents = "none";
        if (kind === "portfolio") {
          await fadeToPortfolio(element, surface, s);
          return;
        }
        plate = await fadeCanvasToPreview(canvas, page, s);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
