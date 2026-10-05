export function lightPosition(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  const nx = Math.max(0, Math.min(1, (x - rect.left) / Math.max(1, rect.width)));
  const ny = Math.max(0, Math.min(1, (y - rect.top) / Math.max(1, rect.height)));
  return {
    "--row-x": `${(nx * 100).toFixed(2)}%`,
    "--row-y": `${(ny * 100).toFixed(2)}%`,
  };
}
