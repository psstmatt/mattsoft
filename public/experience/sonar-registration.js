// Measured against the unchanged generated 1254px Sonar07 pose.
// The page is sampled separately; the generated blank glass never contains UI.
export const SONAR_ASSET = "/experience/models/anduril-sonar-v2/case.png";
export const SONAR_SOURCE_SIZE = 1254;
export const SONAR_QUAD = Object.freeze([
  [320, 323],
  [883, 285],
  [872, 817],
  [263, 817],
]);

const cubic = (a, b, c, d, t) =>
  a.map(
    (value, axis) =>
      value * (1 - t) ** 3 +
      3 * b[axis] * t * (1 - t) ** 2 +
      3 * c[axis] * t * t * (1 - t) +
      d[axis] * t ** 3,
  );

// Coons surface: each edge follows the bowed tube instead of joining four
// corners with straight lines. A small hidden overscan stays behind the exact
// aperture, covering its curved shoulders without altering the case or bezel.
export function sonarScreenPoint(u, v) {
  const [tl, tr, br, bl] = SONAR_QUAD;
  const top = cubic(tl, [480, 290], [713, 280], tr, u);
  const bottom = cubic(bl, [405, 835], [686, 834], br, u);
  const left = cubic(tl, [272, 436], [254, 652], bl, v);
  const right = cubic(tr, [906, 428], [897, 680], br, v);
  return [0, 1].map(
    (axis) =>
      top[axis] * (1 - v) +
      bottom[axis] * v +
      left[axis] * (1 - u) +
      right[axis] * u -
      (tl[axis] * (1 - u) * (1 - v) +
        tr[axis] * u * (1 - v) +
        br[axis] * u * v +
        bl[axis] * (1 - u) * v),
  );
}

export function sonarScreenGeometry(source) {
  const scale = source.width / SONAR_SOURCE_SIZE;
  const quad = SONAR_QUAD.map(([x, y]) => [x * scale, y * scale]);
  const mesh = source.topology.uv.map(([u, v]) => sonarScreenPoint(u, v).map((n) => n * scale));
  const boundary = source.topology.boundaryVertexIndices?.map((index) => mesh[index]) || quad;
  return {
    ...source,
    frame: { screenQuad: quad, screenBoundary: boundary, screenMesh: mesh },
  };
}

export function sonarPose(pose) {
  return { x: pose.x + pose.s * 0.035, y: pose.y + pose.s * 0.014, s: pose.s * 0.89 };
}

export function sonarInteractionTarget(active, hovered, focused, reduced = false) {
  return {
    emission: active ? (focused ? 0.9 : hovered ? 0.78 : 0.48) : hovered ? 0.22 : 0,
    lift: active && hovered && !reduced ? 1 : 0,
  };
}

export function easeSonarInteraction(value, target, elapsed, reduced = false) {
  if (reduced || Math.abs(target - value) < 0.002) return target;
  return value + (target - value) * (1 - Math.exp(-Math.max(0, elapsed) / 70));
}

export function sonarGroovePixel(red, green, blue, alpha, x, y, strength) {
  if (alpha < 8) return [0, 0, 0, 0];
  // Preserve black trim, silver controls and the textured side. Only the blue
  // front-face highlights receive the selected cyan groove emission.
  const front = x < 0.79 && y > 0.12 && y < 0.84;
  const blueHighlight = blue - red > 12 && blue - green > 5;
  const ridge = Math.max(0, Math.min(1, (blue - 135) / 95));
  const groove = front && blueHighlight ? ridge * ridge * (3 - 2 * ridge) * strength : 0;
  const knob = Math.max(0, 1 - ((x - 0.624) / 0.026) ** 2 - ((y - 0.747) / 0.032) ** 2);
  const weight = Math.max(groove, knob * strength * 0.28);
  return [
    Math.round(red + ((knob > 0 ? 180 : 52) - red) * weight),
    Math.round(green + (235 - green) * weight),
    Math.round(blue + (242 - blue) * weight),
    alpha,
  ];
}

export const SONAR_APERTURE = Object.freeze([
  [
    [357, 352],
    [492, 321],
    [685, 300],
    [800, 300],
  ],
  [
    [800, 300],
    [848, 299],
    [871, 317],
    [874, 356],
  ],
  [
    [874, 356],
    [886, 479],
    [878, 665],
    [862, 736],
  ],
  [
    [862, 736],
    [856, 777],
    [840, 792],
    [803, 798],
  ],
  [
    [803, 798],
    [649, 807],
    [430, 809],
    [315, 794],
  ],
  [
    [315, 794],
    [287, 792],
    [277, 779],
    [278, 749],
  ],
  [
    [278, 749],
    [272, 626],
    [286, 463],
    [316, 387],
  ],
  [
    [316, 387],
    [326, 368],
    [339, 358],
    [357, 352],
  ],
]);

export function sonarAperturePoints(steps = 24) {
  return SONAR_APERTURE.flatMap((curve) =>
    Array.from({ length: steps }, (_, index) => cubic(...curve, index / steps)),
  );
}

function glassAperture(ctx, scale) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(...SONAR_APERTURE[0][0]);
  for (const [, a, b, end] of SONAR_APERTURE) ctx.bezierCurveTo(...a, ...b, ...end);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function prepareSonarBody(image, meta, strength = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = meta.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sonar case canvas unavailable");
  ctx.drawImage(image, 0, 0, meta.width, meta.width);
  const pixels = ctx.getImageData(0, 0, meta.width, meta.width);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const pixel = i / 4;
    const colour = sonarGroovePixel(
      ...pixels.data.subarray(i, i + 4),
      (pixel % meta.width) / meta.width,
      Math.floor(pixel / meta.width) / meta.width,
      strength,
    );
    pixels.data.set(colour, i);
  }
  ctx.putImageData(pixels, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  glassAperture(ctx, meta.width / SONAR_SOURCE_SIZE);
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}
