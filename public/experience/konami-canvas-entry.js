import {
  promoteEntryCanvas,
  entryPortfolioTarget,
  runEntryTransition,
  ZOOM_MS,
} from "./konami-transition.js?v=31";

// Fit the complete CRT width. Cover-by-height would crop portrait destinations.
export function entryFittedTarget(bounds, width) {
  const s = width / (bounds.x1 - bounds.x0);
  return { x: -bounds.x0 * s, y: -bounds.y0 * s, s };
}

export function zoomCanvasToScreen({
  canvas,
  pose,
  width,
  height,
  bounds,
  external,
  paint,
  signal,
  env = globalThis,
}) {
  signal?.throwIfAborted();
  const promoted = promoteEntryCanvas(canvas, pose, width, height, env);
  const from = promoted.from;
  const to = external
    ? entryFittedTarget(bounds, promoted.width)
    : entryPortfolioTarget(bounds, promoted.width, promoted.height);
  const draw = (progress) => {
    const eased = 1 - Math.pow(1 - progress, 3);
    paint(
      {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        s: from.s + (to.s - from.s) * eased,
      },
      progress,
      promoted,
    );
  };
  draw(0);
  return runEntryTransition({
    duration: env.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : ZOOM_MS,
    frame: draw,
    signal,
    env,
  });
}
