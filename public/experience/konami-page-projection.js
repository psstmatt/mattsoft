// Native Canvas affine triangles flatten the prepared page as the visitor moves
// through the glass. The last frame is the same full-width image as the handoff.
export function affineTriangle(source, target) {
  const [[x0, y0], [x1, y1], [x2, y2]] = source;
  const determinant = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(determinant) < 1e-8) return null;
  const axis = (i) => {
    const [a, b, c] = target.map((p) => p[i]);
    return [
      (a * (y1 - y2) + b * (y2 - y0) + c * (y0 - y1)) / determinant,
      (a * (x2 - x1) + b * (x0 - x2) + c * (x1 - x0)) / determinant,
      (a * (x1 * y2 - x2 * y1) + b * (x2 * y0 - x0 * y2) + c * (x0 * y1 - x1 * y0)) / determinant,
    ];
  };
  const x = axis(0),
    y = axis(1);
  return [x[0], y[0], x[1], y[1], x[2], y[2]];
}

export function fittedPageFrame(quad, source, width, height, sampleHeight, scroll, progress) {
  const t = progress * progress * (3 - 2 * progress);
  const end = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  return {
    quad: quad.map((p, i) => p.map((v, axis) => v + (end[i][axis] - v) * t)),
    sample: [
      0,
      scroll * Math.max(0, 1 - progress / 0.38),
      1,
      sampleHeight + ((height * source.width) / (width * source.height) - sampleHeight) * t,
    ],
  };
}

// Preserve the displayed UV window while the real mesh becomes a flat page.
// Portfolio defaults retain its captured CSS scale and left edge. External
// captures explicitly fit the viewport without changing their source metadata.
export function fittedPortfolioFrame({
  mesh,
  topology,
  sourceSize,
  pose,
  source,
  viewport,
  sampleStart,
  sampleEnd,
  scroll,
  progress,
  displayWidth = source.cssWidth,
  displayLeft = source.cssLeft ?? 0,
}) {
  const t = progress * progress * (3 - 2 * progress);
  const sample = sampleStart.map((value, i) => value + (sampleEnd[i] - value) * t);
  const cssWidth = displayWidth,
    cssHeight = (source.height * cssWidth) / source.width,
    offsetX = displayLeft;
  const points = mesh.map(([x, y], i) => {
    const [u, v] = topology.uv[i];
    const curved = [pose.x + (x / sourceSize) * pose.s, pose.y + (y / sourceSize) * pose.s];
    const flat = [
      offsetX + (sample[0] + u * sample[2]) * cssWidth,
      (sample[1] + v * sample[3]) * cssHeight,
    ];
    return curved.map((value, axis) => value + (flat[axis] - value) * t);
  });
  // Scroll moves the image through the glass; it must not move its geometry.
  sample[1] += scroll * Math.max(0, 1 - progress / 0.38);
  return { mesh: points, sample, viewport, cssWidth, cssHeight, offsetX, flat: progress === 1 };
}

const pageBackgrounds = new WeakMap();
const entryTopologies = new WeakMap();

// The audited CRT grid is 24 by 18 quads. Keep real grid vertices and UVs while
// bounding native Canvas clips to 6 by 6 quads (72 draws) on phone animation
// frames. The idle preview still uses the complete mesh, and the endpoint uses
// one exact blit. Curvature converges continuously to the same flat transform.
export function portfolioEntryTopology(topology) {
  let result = entryTopologies.get(topology);
  if (result) return result;
  const { columns, rows } = topology;
  if (!(columns > 1 && rows > 1 && columns * rows === topology.uv.length)) return topology;
  const selected = (count) => {
    const step = Math.ceil((count - 1) / 6),
      indices = [];
    for (let index = 0; index < count - 1; index += step) indices.push(index);
    indices.push(count - 1);
    return indices;
  };
  const cols = selected(columns),
    lines = selected(rows),
    included = new Set(lines.flatMap((row) => cols.map((col) => row * columns + col))),
    triangles = [];
  for (let row = 0; row < lines.length - 1; row++) {
    for (let col = 0; col < cols.length - 1; col++) {
      const a = lines[row] * columns + cols[col],
        b = lines[row] * columns + cols[col + 1],
        c = lines[row + 1] * columns + cols[col],
        d = lines[row + 1] * columns + cols[col + 1];
      triangles.push([a, b, c], [b, d, c]);
    }
  }
  result = {
    ...topology,
    triangles,
    boundaryVertexIndices: topology.boundaryVertexIndices.filter((index) => included.has(index)),
  };
  entryTopologies.set(topology, result);
  return result;
}

// Draw directly from the original capture at the output canvas resolution.
// The idle 768px case raster must never become the enlarged entry page.
export function paintPortfolioFrame(ctx, source, frame, topology) {
  let background = pageBackgrounds.get(source);
  if (!background) {
    const pixel = source.getContext("2d").getImageData(0, 0, 1, 1).data;
    background = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
    pageBackgrounds.set(source, background);
  }
  ctx.save();
  ctx.fillStyle = background;
  if (frame.flat) {
    // All mesh triangles now have the same affine transform. One exact blit
    // avoids triangle clip seams on the final frame before the DOM handoff.
    ctx.fillRect(0, 0, frame.viewport.width, frame.viewport.height);
    ctx.drawImage(source, frame.offsetX, 0, frame.cssWidth, frame.cssHeight);
    ctx.restore();
    return;
  }
  const projection = portfolioEntryTopology(topology);
  ctx.beginPath();
  projection.boundaryVertexIndices.forEach((index, i) =>
    i ? ctx.lineTo(...frame.mesh[index]) : ctx.moveTo(...frame.mesh[index]),
  );
  ctx.closePath();
  ctx.fill();
  ctx.clip();
  const uv = topology.uv.map(([u, v]) => [
    (frame.sample[0] + u * frame.sample[2]) * source.width,
    (frame.sample[1] + v * frame.sample[3]) * source.height,
  ]);
  for (const ids of projection.triangles) {
    const points = ids.map((i) => frame.mesh[i]);
    // Most of the tube is outside the viewport near the end of the zoom.
    if (
      points.every(([x]) => x < -1) ||
      points.every(([x]) => x > frame.viewport.width + 1) ||
      points.every(([, y]) => y < -1) ||
      points.every(([, y]) => y > frame.viewport.height + 1)
    )
      continue;
    const matrix = affineTriangle(
      ids.map((i) => uv[i]),
      points,
    );
    if (!matrix) continue;
    const center = points.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3], [0, 0]);
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const dx = p[0] - center[0],
        dy = p[1] - center[1],
        length = Math.hypot(dx, dy) || 1;
      const expanded = [p[0] + (dx / length) * 0.5, p[1] + (dy / length) * 0.5];
      i ? ctx.lineTo(...expanded) : ctx.moveTo(...expanded);
    });
    ctx.closePath();
    ctx.clip();
    ctx.transform(...matrix);
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function paintProjectedPage(ctx, source, quad, sample) {
  const pixel = source.getContext("2d").getImageData(0, 0, 1, 1).data;
  ctx.save();
  ctx.beginPath();
  quad.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.closePath();
  ctx.fillStyle = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
  ctx.fill();
  ctx.clip();
  const [x, y, w, h] = [
    sample[0] * source.width,
    sample[1] * source.height,
    sample[2] * source.width,
    sample[3] * source.height,
  ];
  const uv = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  for (const ids of [
    [0, 1, 3],
    [1, 2, 3],
  ]) {
    const points = ids.map((i) => quad[i]);
    const matrix = affineTriangle(
      ids.map((i) => uv[i]),
      points,
    );
    if (!matrix) continue;
    const center = points.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3], [0, 0]);
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => {
      const dx = p[0] - center[0],
        dy = p[1] - center[1];
      const length = Math.hypot(dx, dy) || 1;
      const expanded = [p[0] + (dx / length) * 0.5, p[1] + (dy / length) * 0.5];
      i ? ctx.lineTo(...expanded) : ctx.moveTo(...expanded);
    });
    ctx.closePath();
    ctx.clip();
    ctx.transform(...matrix);
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
