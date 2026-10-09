export const ZOOM_MS = 700;
export const FADE_MS = 220;
export function previewScroll(elapsed, available, reduced = false) {
  if (reduced || elapsed <= 1200 || available <= 0) return 0;
  const phase = ((elapsed - 1200) % 28000) / 28000;
  return (1 - Math.cos(phase * 2 * Math.PI)) * 0.5 * available;
}
// Count only time the selected preview is actually on screen. A prepared card
// must not finish its opening pause while hidden, or jump ahead on reactivation.
export function createPreviewTimeline() {
  let elapsed = 0,
    started = null;
  return {
    elapsed(now) {
      return elapsed + (started === null ? 0 : Math.max(0, now - started));
    },
    setRunning(running, now) {
      if (running && started === null) started = now;
      else if (!running && started !== null) {
        elapsed += Math.max(0, now - started);
        started = null;
      }
    },
  };
}
// One owner for entry. Hiding the page settles it, never leaving a stopped RAF.
export function runEntryTransition({ duration, frame, signal, env = globalThis }) {
  return new Promise((resolve, reject) => {
    let raf = 0,
      done = false,
      timer;
    const start = env.performance.now();
    function cleanup() {
      env.cancelAnimationFrame(raf);
      env.clearTimeout(timer);
      env.document.removeEventListener("visibilitychange", visibility);
      env.removeEventListener?.("resize", resized);
      signal?.removeEventListener("abort", cancel);
    }
    function finish(renderLast = true) {
      if (done) return;
      done = true;
      cleanup();
      try {
        if (renderLast) frame(1);
        resolve();
      } catch (error) {
        reject(error);
      }
    }
    function cancel() {
      if (done) return;
      done = true;
      cleanup();
      reject(signal?.reason || new DOMException("Entry cancelled", "AbortError"));
    }
    function visibility() {
      if (env.document.hidden) finish();
    }
    function resized() {
      finish();
    }
    function tick(now) {
      if (done) return;
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      if (progress === 1) return finish();
      try {
        frame(progress);
      } catch (error) {
        done = true;
        cleanup();
        reject(error);
        return;
      }
      raf = env.requestAnimationFrame(tick);
    }
    if (signal?.aborted) return cancel();
    env.document.addEventListener("visibilitychange", visibility);
    env.addEventListener?.("resize", resized);
    signal?.addEventListener("abort", cancel, { once: true });
    if (env.document.hidden || duration <= 0) return finish();
    timer = env.setTimeout(finish, duration + 1000);
    raf = env.requestAnimationFrame(tick);
  });
}
export function fadeToPortfolio(overlay, surface, signal, env = globalThis) {
  env.document.documentElement.classList.add("computer-handover");
  surface.style.opacity = "0";
  return runEntryTransition({
    duration: FADE_MS,
    signal,
    env,
    frame(progress) {
      const eased = progress * progress * (3 - 2 * progress);
      overlay.style.opacity = String(1 - eased);
      surface.style.opacity = String(eased);
    },
  }).finally(() => {
    surface.style.opacity = "";
  });
}

// Carousel cards are not viewport-sized. Preserve their displayed pose before
// hoisting a canvas out of transformed/clipped carousel ancestors.
export function entryViewportGeometry(rect, pose, oldWidth, oldHeight, width, height) {
  const sx = rect.width / oldWidth,
    sy = rect.height / oldHeight;
  return {
    width,
    height,
    uniform: sx > 0 && sy > 0 && Math.abs(sx - sy) < 0.01,
    from: { x: rect.left + pose.x * sx, y: rect.top + pose.y * sy, s: pose.s * sx },
  };
}
export function hasComplexEntryTransform(canvas, env = globalThis) {
  for (let node = canvas; node && node !== env.document.body; node = node.parentElement) {
    const value = env.getComputedStyle(node).transform;
    if (!value || value === "none") continue;
    if (value.startsWith("matrix3d")) return true;
    const a = value
      .match(/^matrix\(([^)]+)\)$/)?.[1]
      .split(",")
      .map(Number);
    if (
      a &&
      (Math.abs(a[1]) > 0.001 ||
        Math.abs(a[2]) > 0.001 ||
        a[0] <= 0 ||
        a[3] <= 0 ||
        Math.abs(a[0] - a[3]) > 0.01)
    )
      return true;
  }
  return false;
}
export function promoteEntryCanvas(canvas, pose, oldWidth, oldHeight, env = globalThis) {
  const result = entryViewportGeometry(
    canvas.getBoundingClientRect(),
    pose,
    oldWidth,
    oldHeight,
    env.innerWidth,
    env.innerHeight,
  );
  env.document.body.append(canvas);
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "auto",
    left: "0",
    top: "0",
    width: `${result.width}px`,
    height: `${result.height}px`,
    zIndex: "1001",
    pointerEvents: "none",
    transform: "none",
  });
  return result;
}
export function entryCoverTarget(bounds, width, height) {
  const bw = bounds.x1 - bounds.x0,
    bh = bounds.y1 - bounds.y0,
    s = Math.max(width / bw, height / bh);
  return { x: (width - bw * s) / 2 - bounds.x0 * s, y: (height - bh * s) / 2 - bounds.y0 * s, s };
}
// The original green CRT shows the live viewport inside an 80% page box. Its
// landing rectangle must use that box, not the full tube used by external pages.
export function portfolioPageBox(bounds, width, height) {
  const tubeAspect = (bounds.x1 - bounds.x0) / (bounds.y1 - bounds.y0),
    viewAspect = width / height;
  return viewAspect > tubeAspect
    ? { w: 0.8, h: (0.8 * tubeAspect) / viewAspect }
    : { w: (0.8 * viewAspect) / tubeAspect, h: 0.8 };
}
export function entryPortfolioTarget(bounds, width, height) {
  const aspect = portfolioPageBox(bounds, width, height),
    bw = bounds.x1 - bounds.x0,
    bh = bounds.y1 - bounds.y0;
  const page = {
    x: bounds.x0 + (0.5 - aspect.w / 2) * bw,
    y: bounds.y0 + (0.5 - aspect.h / 2) * bh,
    w: aspect.w * bw,
  };
  const s = width / page.w;
  return { x: -page.x * s, y: -page.y * s, s };
}
export async function fadeCanvasToPreview(canvas, source, signal, env = globalThis) {
  const plate = env.document.createElement("canvas");
  const ctx = plate.getContext("2d");
  if (!ctx) throw new Error("Destination handoff canvas unavailable");
  const pixel = source.getContext?.("2d")?.getImageData(0, 0, 1, 1).data;
  function paint() {
    const dpr = Math.min(env.devicePixelRatio || 1, 2);
    plate.width = Math.round(env.innerWidth * dpr);
    plate.height = Math.round(env.innerHeight * dpr);
    ctx.fillStyle = pixel ? `rgb(${pixel[0]},${pixel[1]},${pixel[2]})` : "#0d0c0a";
    ctx.fillRect(0, 0, plate.width, plate.height);
    // A cross-origin desktop capture is a preview, not a responsive destination.
    // Fit its complete width instead of enlarging a CRT until its sides are lost.
    ctx.drawImage(source, 0, 0, plate.width, (source.height * plate.width) / source.width);
  }
  paint();
  Object.assign(plate.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "1002",
    opacity: "0",
    pointerEvents: "none",
  });
  env.document.body.append(plate);
  try {
    await runEntryTransition({
      duration: env.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : FADE_MS,
      signal,
      env,
      frame(t) {
        if (t === 1) paint();
        plate.style.opacity = String(t * t * (3 - 2 * t));
      },
    });
    return plate;
  } catch (error) {
    plate.remove();
    throw error;
  }
}
