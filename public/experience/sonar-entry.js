import { promoteEntryCanvas, runEntryTransition } from "./konami-transition.js?v=34";
import { fittedPortfolioFrame, paintPortfolioFrame } from "./konami-page-projection.js?v=34";
import { previewSampleHeight } from "./konami-screen-source.js?v=34";

export const SONAR_ENTRY_MS = 940;

const clamp = (value) => Math.max(0, Math.min(1, value));
const phase = (value, start, end) => clamp((value - start) / (end - start));
const smooth = (value) => value * value * (3 - 2 * value);
const lerp = (a, b, t) => a + (b - a) * t;

function screenBounds(meta) {
  const xs = meta.frame.screenMesh.map(([x]) => x / meta.width),
    ys = meta.frame.screenMesh.map(([, y]) => y / meta.width);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys) };
}

// A single quiet approach: clear the shell as the measured curved display
// straightens, then hold the exact public capture before the caller navigates.
export function sonarEntryMotion(progress) {
  const p = clamp(Number.isFinite(progress) ? progress : 0),
    caseAlpha = 1 - smooth(phase(p, 0.2, 0.78));
  return {
    progress: p,
    camera: smooth(phase(p, 0, 0.84)),
    flatten: smooth(phase(p, 0.14, 0.9)),
    caseAlpha,
    glassAlpha: 0.16 * (1 - smooth(phase(p, 0, 0.5))) * caseAlpha,
  };
}

export function sonarEntryFrame({
  meta,
  page,
  pose,
  viewport,
  height = viewport.height,
  progress,
  scrollStart = 0,
  bounds = screenBounds(meta),
}) {
  const motion = sonarEntryMotion(progress),
    targetScale = viewport.width / (bounds.right - bounds.left),
    cameraPose = {
      x: lerp(pose.x, -bounds.left * targetScale, motion.camera),
      y: lerp(pose.y, -bounds.top * targetScale, motion.camera),
      s: lerp(pose.s, targetScale, motion.camera),
    },
    frame = fittedPortfolioFrame({
      mesh: meta.frame.screenMesh,
      topology: meta.topology,
      sourceSize: meta.width,
      pose: cameraPose,
      source: page,
      viewport,
      sampleStart: [0, 0, 1, previewSampleHeight(page, true, height)],
      sampleEnd: [0, 0, 1, (viewport.height * page.width) / (viewport.width * page.height)],
      scroll: scrollStart,
      progress: motion.flatten,
      displayWidth: viewport.width,
      displayLeft: 0,
    });
  return { frame, motion, cameraPose };
}

function visibleViewportWidth(env, fallback) {
  // This is an external landing image, so fill the viewport itself. The local
  // portfolio's stable scrollbar gutter must not leave an unpainted side strip.
  return Number.isFinite(env.innerWidth) && env.innerWidth > 0 ? env.innerWidth : fallback;
}

function paintCaseLayer(ctx, image, pose, alpha) {
  if (!image || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, pose.x, pose.y, pose.s, pose.s);
  ctx.restore();
}

// Same entry contract as the Canvas renderer's character modules. The page is
// always sampled from its original capture, never from the idle case composite.
export async function playCharacterEntry({
  canvas,
  body,
  coverage = body,
  glass,
  page,
  meta,
  pose,
  width,
  height,
  scrollStart = 0,
  signal,
  env = globalThis,
}) {
  signal?.throwIfAborted();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sonar entry canvas unavailable");
  const bounds = screenBounds(meta),
    promoted = promoteEntryCanvas(canvas, pose, width, height, env),
    viewportAtStart = {
      width: visibleViewportWidth(env, promoted.width),
      height: promoted.height,
    },
    reduced = env.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const rootStyle = env.document?.documentElement?.style,
    previousGutter = rootStyle?.scrollbarGutter || "";
  // Chromium also clips fixed descendants at a reserved root gutter. Release
  // only that gutter after freezing the initial pose, and restore it on replay.
  if (rootStyle) rootStyle.scrollbarGutter = "auto";
  const restoreGutter = () => {
    if (rootStyle) rootStyle.scrollbarGutter = previousGutter;
  };

  const draw = (progress) => {
    const viewport =
        progress >= 0.9
          ? {
              width: visibleViewportWidth(env, promoted.width),
              height: env.innerHeight > 0 ? env.innerHeight : promoted.height,
            }
          : viewportAtStart,
      dpr = Math.min(env.devicePixelRatio || 1, 2),
      pixelsW = Math.round(viewport.width * dpr),
      pixelsH = Math.round(viewport.height * dpr);
    if (canvas.width !== pixelsW) canvas.width = pixelsW;
    if (canvas.height !== pixelsH) canvas.height = pixelsH;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    const { frame, motion, cameraPose } = sonarEntryFrame({
      meta,
      page,
      pose: promoted.from,
      viewport,
      height,
      progress,
      scrollStart,
      bounds,
    });
    paintPortfolioFrame(ctx, page, frame, meta.topology);
    if (frame.flat) return;
    // At progress zero this reproduces the idle renderer's registered aperture,
    // coverage, reflection, and body order at the promoted viewport pose.
    ctx.globalCompositeOperation = "destination-out";
    paintCaseLayer(ctx, coverage, cameraPose, motion.caseAlpha);
    ctx.globalCompositeOperation = "screen";
    paintCaseLayer(ctx, glass, cameraPose, motion.glassAlpha);
    ctx.globalCompositeOperation = "source-over";
    paintCaseLayer(ctx, body, cameraPose, motion.caseAlpha);
    ctx.globalAlpha = 1;
  };

  try {
    if (!reduced) draw(0);
    await runEntryTransition({
      duration: reduced ? 0 : SONAR_ENTRY_MS,
      frame: draw,
      signal,
      env,
    });
    // A prototype replay may hold the capture. Its existing per-entry signal
    // owns these listeners, so reset cannot repaint the restored carousel.
    if (signal && !signal.aborted) {
      const refit = () => draw(1),
        release = () => {
          restoreGutter();
          env.removeEventListener("resize", refit);
          env.removeEventListener("orientationchange", refit);
          signal.removeEventListener("abort", release);
        };
      env.addEventListener("resize", refit);
      env.addEventListener("orientationchange", refit);
      signal.addEventListener("abort", release, { once: true });
    } else if (signal?.aborted) restoreGutter();
  } catch (error) {
    restoreGutter();
    canvas.remove();
    throw error;
  }
}
