import { promoteEntryCanvas, runEntryTransition } from "./konami-transition.js?v=34";
import {
  fittedPortfolioFrame,
  paintPortfolioFrame,
  portfolioEntryTopology,
} from "./konami-page-projection.js?v=34";
import { previewSampleHeight } from "./konami-screen-source.js?v=34";

// These studies are opt-in. The original green entry never comes through here.
export const CHARACTER_ENTRY_STYLES = Object.freeze(["tactile", "portal", "absurd"]);
export const styles = CHARACTER_ENTRY_STYLES;
export const CHARACTER_ENTRY_DURATIONS = Object.freeze({
  tactile: Object.freeze({ scout: 900, references: 1000 }),
  portal: Object.freeze({ scout: 1050, references: 1100 }),
  absurd: Object.freeze({ scout: 1200, references: 1300 }),
});

const clamp = (value) => Math.max(0, Math.min(1, value));
const phase = (value, start, end) => clamp((value - start) / (end - start));
const smooth = (value) => value * value * (3 - 2 * value);
const lerp = (a, b, t) => a + (b - a) * t;
const bump = (value, start, end) => Math.sin(Math.PI * phase(value, start, end));
const fade = (value, start, end) => 1 - smooth(phase(value, start, end));

function geometry(meta) {
  const points = meta.frame.screenMesh.map(([x, y]) => [x / meta.width, y / meta.width]);
  const xs = points.map(([x]) => x),
    ys = points.map(([, y]) => y),
    left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  return { points, left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}

function materialMatrix(pose, shape, anchor) {
  const c = Math.cos(shape.rotation),
    s = Math.sin(shape.rotation),
    a = pose.s * shape.sx * c,
    b = pose.s * shape.sx * s,
    cc = -pose.s * shape.sy * s,
    d = pose.s * shape.sy * c;
  return [
    a,
    b,
    cc,
    d,
    pose.x + anchor.cx * pose.s - a * anchor.cx - cc * anchor.cy + shape.dx * pose.s,
    pose.y + anchor.cy * pose.s - b * anchor.cx - d * anchor.cy + shape.dy * pose.s,
  ];
}

function project([a, b, c, d, e, f], [x, y]) {
  return [a * x + c * y + e, b * x + d * y + f];
}

// Separate the object's material response, the camera, and the page unrolling.
// The resulting state is deterministic, which also makes animation QA repeatable.
export function characterEntryMotion(style, kind, progress) {
  if (!CHARACTER_ENTRY_STYLES.includes(style)) throw new Error("Unknown character entry style");
  if (kind !== "scout" && kind !== "references") throw new Error("Unknown external computer");
  const p = clamp(Number.isFinite(progress) ? progress : 0),
    scout = kind === "scout",
    shape = { sx: 1, sy: 1, rotation: 0, dx: 0, dy: 0 };
  let camera = 0,
    flatten = 0,
    caseAlpha = 1,
    peel = 0,
    rings = 0,
    orbit = 0,
    puffs = 0;

  if (style === "tactile" && scout) {
    const squeeze = bump(p, 0, 0.27),
      rebound = bump(p, 0.19, 0.48);
    shape.sx += 0.045 * squeeze - 0.024 * rebound;
    shape.sy += -0.1 * squeeze + 0.055 * rebound;
    shape.dy = 0.013 * squeeze;
    shape.dx = Math.sin(phase(p, 0.25, 0.82) * Math.PI * 2) * 0.015 * bump(p, 0.25, 0.82);
    camera = smooth(phase(p, 0.2, 0.87));
    flatten = smooth(phase(p, 0.34, 0.89));
    caseAlpha = fade(p, 0.56, 0.86);
  } else if (style === "tactile") {
    peel = bump(p, 0.035, 0.79);
    shape.rotation = -0.027 * bump(p, 0.06, 0.79);
    shape.dy = 0.035 * smooth(phase(p, 0.17, 0.72));
    camera = 0;
    flatten = smooth(phase(p, 0.12, 0.89));
    caseAlpha = fade(p, 0.32, 0.77);
  } else if (style === "portal") {
    const inhale = bump(p, 0, 0.31);
    shape.sx -= (scout ? 0.065 : 0.017) * inhale;
    shape.sy -= (scout ? 0.045 : 0.012) * inhale;
    camera = Math.pow(smooth(phase(p, 0.15, 0.83)), 1.6);
    flatten = smooth(phase(p, 0.38, 0.9));
    caseAlpha = fade(p, 0.49, 0.8);
    rings = bump(p, 0.1, 0.88);
  } else if (scout) {
    const anticipation = bump(p, 0, 0.14),
      first = smooth(phase(p, 0.08, 0.25)),
      second = smooth(phase(p, 0.23, 0.38)),
      release = fade(p, 0.44, 0.7),
      rebound = bump(p, 0.44, 0.68);
    shape.sx += 0.025 * anticipation + (0.2 * first + 0.2 * second) * release - 0.025 * rebound;
    shape.sy += -0.045 * anticipation + (0.12 * first + 0.13 * second) * release + 0.018 * rebound;
    shape.dy = 0.009 * anticipation;
    shape.rotation = -0.012 * bump(p, 0.08, 0.44);
    camera = smooth(phase(p, 0.43, 0.74));
    // The camera clears the vinyl first. Frame geometry also gates this phase,
    // so the sharp destination can never travel in front of a visible bezel.
    flatten = phase(p, 0.74, 0.9);
    caseAlpha = p < 0.9 ? 1 : 0;
  } else {
    shape.rotation = -0.018 * bump(p, 0, 0.25) + 0.006 * bump(p, 0.25, 0.51);
    shape.sx += 0.012 * bump(p, 0, 0.25) - 0.065 * smooth(phase(p, 0.25, 0.7));
    shape.sy = shape.sx;
    camera = 0.18 * smooth(phase(p, 0.25, 0.76));
    flatten = phase(p, 0.25, 0.88);
    caseAlpha = p < 0.88 ? 1 : 0;
    orbit = phase(p, 0.25, 0.82);
  }

  // Hold a quiet, exact destination at the end, before the caller navigates.
  if (p >= 0.94) {
    flatten = 1;
    caseAlpha = peel = rings = puffs = 0;
    orbit = style === "absurd" && !scout ? 1 : 0;
  }
  return {
    progress: p,
    shape,
    camera,
    flatten,
    caseAlpha,
    glassAlpha: 0.16 * fade(p, 0.03, style === "absurd" ? (scout ? 0.43 : 0.25) : 0.62) * caseAlpha,
    peel,
    rings,
    orbit,
    puffs,
    effect:
      style === "tactile"
        ? scout
          ? "squeeze"
          : "peel"
        : style === "portal"
          ? "tunnel"
          : scout
            ? "inflate"
            : "orbit",
  };
}

// Exported for geometric tests; no raster is ever substituted for the page source.
export function characterEntryFrame({
  meta,
  page,
  pose,
  viewport,
  height = viewport.height,
  kind,
  style,
  progress,
  scrollStart = 0,
  measured = geometry(meta),
}) {
  const motion = characterEntryMotion(style, kind, progress),
    throughVinyl = style === "absurd" && kind === "scout",
    // The measured quad extends underneath the rounded vinyl. This conservative
    // inner rectangle is entirely clear glass in the existing PNG, including its
    // rounded corners; fitting both dimensions puts every bezel outside view.
    inset = Math.min(measured.right - measured.left, measured.bottom - measured.top) * 0.08,
    quad = throughVinyl
      ? meta.frame.screenQuad.map(([x, y]) => [x / meta.width, y / meta.width])
      : null,
    aperture = throughVinyl
      ? {
          left: Math.max(quad[0][0], quad[3][0]) + inset,
          right: Math.min(quad[1][0], quad[2][0]) - inset,
          top: Math.max(quad[0][1], quad[1][1]) + inset,
          bottom: Math.min(quad[2][1], quad[3][1]) - inset,
        }
      : null,
    targetScale = throughVinyl
      ? Math.max(
          viewport.width / (aperture.right - aperture.left),
          viewport.height / (aperture.bottom - aperture.top),
        ) * 1.04
      : viewport.width / (measured.right - measured.left),
    targetX = throughVinyl
      ? viewport.width / 2 - ((aperture.left + aperture.right) / 2) * targetScale
      : -measured.left * targetScale,
    targetY = throughVinyl
      ? viewport.height / 2 - ((aperture.top + aperture.bottom) / 2) * targetScale
      : -measured.top * targetScale,
    cameraPose = {
      x: lerp(pose.x, targetX, motion.camera),
      y: lerp(pose.y, targetY, motion.camera),
      s: lerp(pose.s, targetScale, motion.camera),
    },
    matrix = materialMatrix(cameraPose, motion.shape, measured),
    transformed = measured.points.map((point) => project(matrix, point)),
    clearAperture = throughVinyl
      ? [
          [aperture.left, aperture.top],
          [aperture.right, aperture.top],
          [aperture.right, aperture.bottom],
          [aperture.left, aperture.bottom],
        ].map((point) => project(matrix, point))
      : null,
    apertureCovered =
      throughVinyl &&
      [
        [0, 0],
        [viewport.width, 0],
        [viewport.width, viewport.height],
        [0, viewport.height],
      ].every((point) => pointInPolygon(point, clearAperture));
  if (throughVinyl && !apertureCovered) {
    motion.flatten = 0;
    motion.caseAlpha = 1;
  }
  const frame = fittedPortfolioFrame({
    mesh: transformed,
    topology: meta.topology,
    sourceSize: 1,
    pose: { x: 0, y: 0, s: 1 },
    source: page,
    viewport,
    sampleStart: [0, 0, 1, previewSampleHeight(page, true, height)],
    sampleEnd: [0, 0, 1, (viewport.height * page.width) / (viewport.width * page.height)],
    scroll: scrollStart,
    progress: motion.flatten,
    displayWidth: viewport.width,
    displayLeft: 0,
  });
  let sourceTopology = meta.topology;
  if (throughVinyl && motion.progress >= 0.43 && !frame.flat) {
    const xs = frame.mesh.map(([x]) => x),
      ys = frame.mesh.map(([, y]) => y),
      left = Math.min(...xs),
      top = Math.min(...ys),
      screenWidth = Math.max(...xs) - left,
      screenHeight = Math.max(...ys) - top,
      destinationScale = viewport.width / page.width,
      sampleWidth = Math.max(1, screenWidth / viewport.width),
      fittedHeight = screenHeight / (destinationScale * page.height),
      sampleHeight =
        motion.camera === 1
          ? fittedHeight
          : Math.max(previewSampleHeight(page, true, height), fittedHeight),
      align = smooth(phase(motion.progress, 0.43, 0.5)),
      alignX =
        motion.camera === 1 ? 1 : smooth(phase(screenWidth / viewport.width, 0.65, 1)) * align,
      alignY = motion.camera === 1 ? 1 : smooth(phase(fittedHeight, 0.65, 1)) * align;
    // The vinyl keeps approaching after its screen reaches the page's final
    // scale. Sample a larger window of the original source instead of enlarging
    // its text further, including background beyond the captured page. Once an
    // edge passes the viewport, pin the source origin there through flattening.
    frame.sample = [
      (Math.min(0, left) * sampleWidth) / screenWidth,
      frame.sample[1] + (Math.min(0, top) * sampleHeight) / screenHeight,
      sampleWidth,
      sampleHeight,
    ];
    // Straighten the source coordinates as each axis reaches its destination
    // scale. The physical mesh and opaque aperture still travel together, while
    // every visible glyph then has the exact final affine scale during flatten.
    sourceTopology = {
      ...portfolioEntryTopology(meta.topology),
      columns: 0,
      rows: 0,
      uv: meta.topology.uv.map(([u, v], index) => [
        lerp(u, (frame.mesh[index][0] - left) / screenWidth, alignX),
        lerp(v, (frame.mesh[index][1] - top) / screenHeight, alignY),
      ]),
    };
  }
  if (motion.peel > 0 && !frame.flat) {
    const lift = Math.min(pose.s, viewport.width) * 0.065 * motion.peel;
    frame.mesh = frame.mesh.map(([x, y], i) => {
      const [u, v] = meta.topology.uv[i],
        curl = u * u * (1 - v) * (1 - v);
      return [x + lift * curl * 0.48, y - lift * curl];
    });
  }
  return { frame, motion, matrix, cameraPose, measured, apertureCovered, sourceTopology };
}

// Coordinates measured on the existing 1024px References image. Each crop is
// inset to its foil boundary so ivory rectangle corners never become sprites.
const STICKERS = Object.freeze([
  { crop: [188, 139, 140, 58], shape: "pill" },
  { crop: [340, 697, 121, 96], shape: "star" },
  { crop: [484, 711, 211, 92], shape: "pill" },
  { crop: [698, 222, 67, 99], shape: "pill" },
  { crop: [686, 378, 69, 85], shape: "ellipse" },
  { crop: [127, 373, 70, 105], shape: "pill" },
]);

// Six source crops at most. A crop stays registered to its baked art until the
// growing page covers that art; its individual release time then starts its orbit.
export function characterEntryParticles(style, kind, progress, releases = []) {
  const motion = characterEntryMotion(style, kind, progress);
  if (style !== "absurd" || kind === "scout" || motion.orbit <= 0 || motion.orbit >= 1) return [];
  return STICKERS.map((sticker, i) => {
    const q = releases[i] === null ? 0 : phase(motion.progress, releases[i] ?? 0.32, 0.82),
      angle = smooth(q) * Math.PI * 0.56,
      [x, y, w, h] = sticker.crop,
      dx = (x + w / 2) / 1024 - 0.45,
      dy = (y + h / 2) / 1024 - 0.425,
      c = Math.cos(angle),
      s = Math.sin(angle);
    return {
      index: i,
      x: 0.45 + dx * c - dy * s,
      y: 0.425 + dx * s + dy * c,
      expansion: q * q,
      scale: 1 + 0.22 * smooth(phase(q, 0, 0.45)) + 0.25 * q * q,
      rotation: angle * (i % 2 ? -0.45 : 0.5),
      alpha: 1,
    };
  });
}

function roundedPath(ctx, points, radius = 0.13) {
  ctx.beginPath();
  points.forEach((point, i) => {
    const before = points[(i + points.length - 1) % points.length],
      after = points[(i + 1) % points.length],
      start = point.map((value, axis) => lerp(value, before[axis], radius)),
      end = point.map((value, axis) => lerp(value, after[axis], radius));
    if (i === 0) ctx.moveTo(...start);
    else ctx.lineTo(...start);
    ctx.quadraticCurveTo(...point, ...end);
  });
  ctx.closePath();
}

function imageAt(ctx, image, matrix, alpha) {
  if (!image || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.transform(...matrix);
  ctx.drawImage(image, 0, 0, 1, 1);
  ctx.restore();
}

function preparePaint(ctx, viewport, kind) {
  const { width, height } = viewport,
    wash = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      0,
      width * 0.5,
      height * 0.45,
      Math.max(width, height) * 0.8,
    ),
    foil = ctx.createLinearGradient(0, 0, width, height * 0.4);
  wash.addColorStop(0, kind === "scout" ? "rgba(115,43,4,0)" : "rgba(210,215,228,0)");
  wash.addColorStop(1, kind === "scout" ? "rgba(28,15,8,.72)" : "rgba(38,39,51,.48)");
  for (const [stop, color] of [
    [0, "#fffbe8"],
    [0.21, "#c4e9ff"],
    [0.44, "#dcc6ff"],
    [0.66, "#edffc4"],
    [0.84, "#ffd5f1"],
    [1, "#fafaff"],
  ])
    foil.addColorStop(stop, color);
  return { wash, foil };
}

function visibleViewportWidth(env, fallback) {
  const windowWidth = env.innerWidth > 0 ? env.innerWidth : fallback;
  const root = env.document?.documentElement;
  // With overflow:hidden + scrollbar-gutter:stable, Chromium's clientWidth
  // still includes the gutter. The root's measured layout rect does not.
  const widths = [windowWidth, root?.clientWidth, root?.getBoundingClientRect?.().width];
  return Math.min(...widths.filter((value) => Number.isFinite(value) && value > 0));
}

function paintRings(ctx, state, meta, pose, viewport, kind, style, palette) {
  const { motion, measured } = state;
  if (motion.rings <= 0.0001) return;
  const center = [pose.x + measured.cx * pose.s, pose.y + measured.cy * pose.s],
    quad = (meta.frame.screenQuad || meta.frame.screenBoundary)
      .slice(0, 4)
      .map(([x, y]) => [x / meta.width - measured.cx, y / meta.width - measured.cy]),
    count = style === "portal" ? 3 : 2;
  ctx.save();
  ctx.globalAlpha = motion.rings * (style === "portal" ? 0.72 : 0.45);
  ctx.fillStyle = palette.wash;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  for (let i = count - 1; i >= 0; i--) {
    const start = style === "portal" ? 0.11 + i * 0.095 : 0.43 + i * 0.08,
      q = phase(motion.progress, start, 0.83 + i * 0.015),
      scale = pose.s * (0.86 + 5.0 * q * q),
      shear = kind === "scout" ? 0 : (i % 2 ? -0.045 : 0.045) * Math.sin(q * Math.PI),
      points = quad.map(([x, y]) => [center[0] + (x + shear * y) * scale, center[1] + y * scale]);
    if (q <= 0 || q >= 1) continue;
    ctx.globalAlpha = motion.rings * Math.sin(q * Math.PI) * 0.82;
    roundedPath(ctx, points, kind === "scout" ? 0.2 : 0.1);
    ctx.strokeStyle = kind === "scout" ? "#ff810a" : palette.foil;
    ctx.lineWidth = kind === "scout" ? 4 + q * 14 : 2 + q * 5;
    ctx.stroke();
    ctx.globalAlpha *= 0.8;
    ctx.strokeStyle = kind === "scout" ? "#ffe1a6" : "#ffffff";
    ctx.lineWidth = 0.8 + q * 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function paintPeel(ctx, state, topology, palette) {
  const { frame, motion } = state;
  if (motion.peel <= 0.0001 || frame.flat) return;
  const nearest = (u, v) => {
    let best = 0,
      distance = Infinity;
    topology.uv.forEach(([a, b], index) => {
      const d = Math.abs(a - u) + Math.abs(b - v);
      if (d < distance) {
        best = index;
        distance = d;
      }
    });
    return frame.mesh[best];
  };
  const corner = nearest(1, 0),
    left = nearest(0, 0),
    bottom = nearest(1, 1),
    fold = 0.15 * motion.peel,
    a = corner.map((value, axis) => lerp(value, left[axis], fold)),
    b = corner.map((value, axis) => lerp(value, bottom[axis], fold)),
    inset = [(a[0] + b[0]) / 2 - 5 * motion.peel, (a[1] + b[1]) / 2 + 5 * motion.peel];
  ctx.save();
  ctx.globalAlpha = 0.88 * motion.peel;
  ctx.beginPath();
  ctx.moveTo(...a);
  ctx.quadraticCurveTo(...corner, ...b);
  ctx.lineTo(...inset);
  ctx.closePath();
  ctx.fillStyle = palette.foil;
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.stroke();
  ctx.restore();
}

function stickerPath(ctx, sticker, width, height) {
  const x = -width / 2,
    y = -height / 2;
  ctx.beginPath();
  if (sticker.shape === "star") {
    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 10,
        radius = i % 2 ? 0.4 : 0.49,
        point = [Math.cos(angle) * width * radius, Math.sin(angle) * height * radius];
      if (i === 0) ctx.moveTo(...point);
      else ctx.lineTo(...point);
    }
    ctx.closePath();
  } else if (sticker.shape === "ellipse")
    ctx.ellipse(0, 0, width * 0.48, height * 0.48, 0, 0, Math.PI * 2);
  else {
    const radius = Math.min(width, height) * 0.3;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

function pointInPolygon([x, y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i],
      [bx, by] = polygon[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function visiblePolygon(polygon, viewport) {
  // A crop partly outside the viewport can still release once its visible part
  // is covered. Clip its four corners before testing against the page boundary.
  for (const [axis, edge, direction] of [
    [0, 0, 1],
    [0, viewport.width, -1],
    [1, 0, 1],
    [1, viewport.height, -1],
  ]) {
    const result = [];
    polygon.forEach((point, index) => {
      const previous = polygon[(index + polygon.length - 1) % polygon.length],
        here = (point[axis] - edge) * direction >= 0,
        before = (previous[axis] - edge) * direction >= 0;
      if (here !== before) {
        const t = (edge - previous[axis]) / (point[axis] - previous[axis]);
        result.push(previous.map((value, i) => lerp(value, point[i], t)));
      }
      if (here) result.push(point);
    });
    polygon = result;
  }
  return polygon;
}

function paintStickerOrbit(ctx, body, state, topology, viewport, releases) {
  const { motion, matrix, frame } = state,
    boundary = topology.boundaryVertexIndices.map((index) => frame.mesh[index]),
    wideOrbit =
      smooth(phase(viewport.width, 700, 1000)) *
      smooth(phase(viewport.width / viewport.height, 1, 1.5)),
    edges = wideOrbit
      ? {
          left: Math.min(...boundary.map(([x]) => x)),
          right: Math.max(...boundary.map(([x]) => x)),
          top: Math.min(...boundary.map(([, y]) => y)),
          bottom: Math.max(...boundary.map(([, y]) => y)),
        }
      : null;
  STICKERS.forEach(({ crop: [x, y, w, h] }, i) => {
    if (releases[i]) return;
    const corners = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ].map((point) =>
        project(
          matrix,
          point.map((value) => value / 1024),
        ),
      ),
      visible = visiblePolygon(corners, viewport);
    if (visible.every((point) => pointInPolygon(point, boundary)))
      releases[i] = { progress: motion.progress, matrix };
  });
  const particles = characterEntryParticles(
    "absurd",
    "references",
    motion.progress,
    STICKERS.map((_, i) => releases[i]?.progress ?? null),
  );
  for (const particle of particles) {
    const sticker = STICKERS[particle.index],
      [x, y, w, h] = sticker.crop,
      anchor = releases[particle.index]?.matrix ?? matrix,
      center = project(anchor, [0.45, 0.425]),
      rotated = project(anchor, [particle.x, particle.y]),
      dx = rotated[0] - center[0],
      dy = rotated[1] - center[1],
      width = (w / 1024) * particle.scale,
      height = (h / 1024) * particle.scale,
      extent =
        Math.max(width, height) *
        Math.max(Math.hypot(anchor[0], anchor[1]), Math.hypot(anchor[2], anchor[3])),
      exitRadius =
        (Math.hypot(viewport.width, viewport.height) + extent) / Math.max(1, Math.hypot(dx, dy)),
      q = Math.sqrt(particle.expansion),
      // Wide pages hide a circular orbit for too long. Let the same crops rise
      // to that page's perimeter, make their arc there, then leave. Narrow views
      // keep their existing quieter trajectory and the page still occludes all
      // sprites, so none can move across its text.
      perimeterRadius = wideOrbit
        ? Math.max(
            1,
            Math.min(
              Math.abs(dx) < 0.001
                ? Infinity
                : ((dx > 0 ? edges.right + extent * 0.55 : edges.left - extent * 0.55) -
                    center[0]) /
                    dx,
              Math.abs(dy) < 0.001
                ? Infinity
                : ((dy > 0 ? edges.bottom + extent * 0.55 : edges.top - extent * 0.55) -
                    center[1]) /
                    dy,
            ),
          )
        : 1,
      perimeterArc = lerp(
        lerp(1, perimeterRadius, smooth(phase(q, 0, 0.2))),
        exitRadius,
        smooth(phase(q, 0.56, 1)),
      ),
      radius = lerp(lerp(1, Math.max(1, exitRadius), particle.expansion), perimeterArc, wideOrbit),
      px = center[0] + dx * radius,
      py = center[1] + dy * radius,
      sourceScale = (body.naturalWidth || body.width) / 1024;
    if (
      px + extent < 0 ||
      py + extent < 0 ||
      px - extent > viewport.width ||
      py - extent > viewport.height
    )
      continue;
    ctx.save();
    ctx.transform(anchor[0], anchor[1], anchor[2], anchor[3], px, py);
    ctx.rotate(particle.rotation);
    stickerPath(ctx, sticker, width, height);
    ctx.clip();
    ctx.drawImage(
      body,
      x * sourceScale,
      y * sourceScale,
      w * sourceScale,
      h * sourceScale,
      -width / 2,
      -height / 2,
      width,
      height,
    );
    ctx.restore();
  }
}

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
  kind,
  style,
  scrollStart = 0,
  signal,
  env = globalThis,
}) {
  signal?.throwIfAborted();
  // Validate before taking ownership of the existing renderer's primary canvas.
  characterEntryMotion(style, kind, 0);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Character entry canvas unavailable");
  const promoted = promoteEntryCanvas(canvas, pose, width, height, env),
    // A stable desktop scrollbar gutter is outside the drawable content area.
    // Fit the source to that area throughout the motion, not under the gutter.
    viewportAtStart = { ...promoted, width: visibleViewportWidth(env, promoted.width) },
    measured = geometry(meta),
    reduced = env.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    dpr = Math.min(env.devicePixelRatio || 1, 2);
  const stickerReleases = [];
  let palette;
  const draw = (progress) => {
    const viewport =
      progress >= 0.94
        ? {
            width: visibleViewportWidth(env, promoted.width),
            height: env.innerHeight > 0 ? env.innerHeight : promoted.height,
          }
        : viewportAtStart;
    const pixelsW = Math.round(viewport.width * dpr),
      pixelsH = Math.round(viewport.height * dpr);
    if (canvas.width !== pixelsW) canvas.width = pixelsW;
    if (canvas.height !== pixelsH) canvas.height = pixelsH;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    const state = characterEntryFrame({
      meta,
      page,
      pose: promoted.from,
      viewport,
      height,
      kind,
      style,
      progress,
      scrollStart,
      measured,
    });
    if (state.frame.flat) {
      paintPortfolioFrame(ctx, page, state.frame, meta.topology);
      return;
    }
    palette ||= preparePaint(ctx, viewportAtStart, kind);
    paintRings(ctx, state, meta, promoted.from, viewport, kind, style, palette);
    // Once the foil corner lifts, the page passes in front of its bezel. Until
    // then the original coverage/reflectance order reproduces the idle frame.
    const liftedSheet =
      (kind === "references" && style === "tactile" && progress > 0.1) ||
      (kind === "references" && style === "absurd" && state.motion.flatten > 0);
    if (liftedSheet) imageAt(ctx, body, state.matrix, state.motion.caseAlpha);
    // The page occludes the opaque case and each departing sticker. A released
    // crop can orbit beyond the page edge without ever crossing readable text.
    if (style === "absurd" && kind === "references" && liftedSheet)
      paintStickerOrbit(ctx, body, state, meta.topology, viewport, stickerReleases);
    paintPortfolioFrame(ctx, page, state.frame, state.sourceTopology);
    if (!liftedSheet && state.motion.caseAlpha > 0) {
      ctx.globalCompositeOperation = "destination-out";
      imageAt(ctx, coverage, state.matrix, state.motion.caseAlpha);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalCompositeOperation = "screen";
    imageAt(ctx, glass, state.matrix, state.motion.glassAlpha);
    ctx.globalCompositeOperation = "source-over";
    if (!liftedSheet) imageAt(ctx, body, state.matrix, state.motion.caseAlpha);
    paintPeel(ctx, state, meta.topology, palette);
    ctx.globalAlpha = 1;
  };
  try {
    if (!reduced) draw(0);
    await runEntryTransition({
      duration: reduced ? 0 : CHARACTER_ENTRY_DURATIONS[style][kind],
      frame: draw,
      signal,
      env,
    });
    // Replay can hold this exact source indefinitely. Its per-entry signal owns
    // the final-frame listener too, so a reset cannot repaint the restored scene.
    if (signal && !signal.aborted) {
      const refit = () => draw(1),
        release = () => {
          env.removeEventListener("resize", refit);
          env.removeEventListener("orientationchange", refit);
          signal.removeEventListener("abort", release);
        };
      env.addEventListener("resize", refit);
      env.addEventListener("orientationchange", refit);
      signal.addEventListener("abort", release, { once: true });
    }
  } catch (error) {
    // Ownership of RAF/timers belongs to runEntryTransition; do not leave its
    // promoted overlay blocking the live scene after cancellation or paint failure.
    canvas.remove();
    throw error;
  }
}
