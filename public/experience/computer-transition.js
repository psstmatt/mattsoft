export const ZOOM_MS = 700;
export const FADE_MS = 220;
export function previewScroll(elapsed, available, reduced = false) {
  if (reduced || elapsed <= 1200 || available <= 0) return 0;
  const phase = ((elapsed - 1200) % 28000) / 28000;
  return (1 - Math.cos(phase * 2 * Math.PI)) * 0.5 * available;
}
// One owner for entry. Hiding the page settles it, never leaving a stopped RAF.
export function runEntryTransition({
  duration,
  frame,
  signal,
  env = globalThis,
}) {
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
      finish(false);
    }
    function visibility() {
      if (env.document.hidden) finish();
    }
    function resized() {
      finish(false);
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
