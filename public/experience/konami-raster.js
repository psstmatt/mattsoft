const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const texturePixels = new WeakMap();
const rasterMaps = new WeakMap();

function prepareRaster(ctx, frame, topology, sourceSize) {
  const size = ctx.canvas.width,
    scale = size / sourceSize,
    coordinates = new Float32Array(size * size * 2);
  coordinates.fill(NaN);
  const mesh = frame.screenMesh.map((p) => [p[0] * scale, p[1] * scale]);
  for (const face of topology.triangles) {
    const [a, b, c] = face.map((i) => mesh[i]),
      [ta, tb, tc] = face.map((i) => topology.uv[i]),
      det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(det) < 1e-8) continue;
    const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))),
      right = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0], c[0]))),
      top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))),
      bottom = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const wa = ((b[1] - c[1]) * (x + 0.5 - c[0]) + (c[0] - b[0]) * (y + 0.5 - c[1])) / det,
          wb = ((c[1] - a[1]) * (x + 0.5 - c[0]) + (a[0] - c[0]) * (y + 0.5 - c[1])) / det,
          wc = 1 - wa - wb;
        if (wa < -1e-7 || wb < -1e-7 || wc < -1e-7) continue;
        const index = (y * size + x) * 2;
        coordinates[index] = ta[0] * wa + tb[0] * wb + tc[0] * wc;
        coordinates[index + 1] = ta[1] * wa + tb[1] * wb + tc[1] * wc;
      }
  }
  const indices = [],
    uvs = [];
  for (let index = 0; index < size * size; index++) {
    if (Number.isNaN(coordinates[index * 2])) continue;
    indices.push(index * 4);
    uvs.push(coordinates[index * 2], coordinates[index * 2 + 1]);
  }
  const surface = document.createElement("canvas");
  surface.width = surface.height = size;
  const out = surface.getContext("2d");
  return {
    size,
    frame,
    topology,
    sourceSize,
    surface,
    out,
    indices: new Uint32Array(indices),
    uvs: new Float32Array(uvs),
    pixels: out.createImageData(size, size),
  };
}
// Rasterize the small projected CRT, not the entire case. Barycentric UVs use
// every supplied curved-mesh vertex and avoid hundreds of Canvas clipping calls.
export function rasterPreview(ctx, image, frame, topology, sourceSize, sample = [0, 0, 1, 1]) {
  let texture = texturePixels.get(image);
  if (!texture) {
    texture = image.getContext("2d").getImageData(0, 0, image.width, image.height);
    texturePixels.set(image, texture);
  }
  let raster = rasterMaps.get(ctx);
  if (
    !raster ||
    raster.size !== ctx.canvas.width ||
    raster.frame !== frame ||
    raster.topology !== topology ||
    raster.sourceSize !== sourceSize
  ) {
    raster = prepareRaster(ctx, frame, topology, sourceSize);
    rasterMaps.set(ctx, raster);
  }
  const { surface, out, pixels, indices, uvs } = raster,
    dst = pixels.data,
    src = texture.data,
    tw = texture.width,
    th = texture.height;
  // Geometry is fixed for the fallback. Only the page's sampling offset changes
  // during scrolling; reuse the UV map and output buffer on every frame.
  for (let index = 0; index < indices.length; index++) {
    const u = clamp((sample[0] + uvs[index * 2] * sample[2]) * (tw - 1), 0, tw - 1),
      v = clamp((sample[1] + uvs[index * 2 + 1] * sample[3]) * (th - 1), 0, th - 1),
      sx = Math.floor(u),
      sy = Math.floor(v),
      rx = Math.min(sx + 1, tw - 1),
      by = Math.min(sy + 1, th - 1),
      fx = u - sx,
      fy = v - sy,
      di = indices[index],
      p00 = (sy * tw + sx) * 4,
      p10 = (sy * tw + rx) * 4,
      p01 = (by * tw + sx) * 4,
      p11 = (by * tw + rx) * 4;
    for (let channel = 0; channel < 3; channel++)
      dst[di + channel] =
        (src[p00 + channel] * (1 - fx) + src[p10 + channel] * fx) * (1 - fy) +
        (src[p01 + channel] * (1 - fx) + src[p11 + channel] * fx) * fy;
    dst[di + 3] = 255;
  }
  out.putImageData(pixels, 0, 0);
  const points = frame.screenBoundary || frame.screenQuad;
  ctx.save();
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.closePath();
  ctx.fillStyle = `rgb(${src[0]},${src[1]},${src[2]})`;
  ctx.fill();
  ctx.drawImage(surface, 0, 0, sourceSize, sourceSize);
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
