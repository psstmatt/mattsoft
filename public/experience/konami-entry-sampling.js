// Keep the CRT's page window continuous when a stable-height phone stage is
// promoted to Safari's currently visible viewport. The display geometry and
// page sampling reach the destination together as the glass flattens.
export function entrySamplingViewport(from, to, flatten) {
  const t = Math.max(0, Math.min(1, flatten));
  return {
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t,
  };
}

export function alignPortfolioEntryTarget(target, viewportWidth, captureWidth, captureLeft = 0) {
  return {
    ...target,
    x: target.x + (captureWidth - viewportWidth) / 2 + captureLeft,
  };
}
