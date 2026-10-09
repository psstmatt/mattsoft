// The generated vinyl has its own aperture; never reuse the old shell's mask.
// Coordinates were measured against the unchanged 1254px image, with the quad
// extending under its opaque bezel so rounded edges are defined by the asset.
export const INFLATABLE_ASSET = "/experience/models/scout-inflatable-v1/case.png";
export const INFLATABLE_QUAD = Object.freeze([
  [304, 268],
  [881, 271],
  [851, 779],
  [258, 733],
]);
export function inflatableScreenGeometry(source) {
  const width = source.width;
  const quad = INFLATABLE_QUAD.map(([x, y]) => [(x * width) / 1254, (y * width) / 1254]);
  const project = ([u, v]) =>
    [0, 1].map(
      (axis) =>
        quad[0][axis] * (1 - u) * (1 - v) +
        quad[1][axis] * u * (1 - v) +
        quad[2][axis] * u * v +
        quad[3][axis] * (1 - u) * v,
    );
  return {
    ...source,
    frame: { screenQuad: quad, screenBoundary: quad, screenMesh: source.topology.uv.map(project) },
  };
}
// Match the other computers' visible body width; the generated image has less
// empty margin than the original frame. The screen hit target uses this pose too.
export function inflatablePose(pose) {
  return { x: pose.x + pose.s * 0.008, y: pose.y + pose.s * 0.018, s: pose.s * 0.92 };
}

export function fitInflatableGlass(image, oldMeta, newMeta) {
  const bounds = (points) => {
    const x = points.map((p) => p[0]),
      y = points.map((p) => p[1]);
    return [
      Math.min(...x),
      Math.min(...y),
      Math.max(...x) - Math.min(...x),
      Math.max(...y) - Math.min(...y),
    ];
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = newMeta.width;
  const from = bounds(oldMeta.frame.screenQuad).map(
    (n) => (n * image.naturalWidth) / oldMeta.width,
  );
  canvas.getContext("2d").drawImage(image, ...from, ...bounds(newMeta.frame.screenQuad));
  return canvas;
}
