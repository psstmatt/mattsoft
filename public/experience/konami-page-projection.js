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
