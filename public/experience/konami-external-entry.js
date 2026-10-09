// External pages are captured at their own width. Flatten the tube into the
// current browser aspect while revealing enough of that capture at one scale.
export function externalEntryTarget(bounds, viewport, source) {
  const width = bounds.x1 - bounds.x0;
  return {
    x0: bounds.x0,
    y0: bounds.y0,
    x1: bounds.x1,
    y1: bounds.y0 + (width * viewport.height) / viewport.width,
    sampleHeight: (viewport.height * source.naturalWidth) / (viewport.width * source.naturalHeight),
  };
}

export function externalEntrySample(previewHeight, targetHeight, flatten) {
  const t = Math.max(0, Math.min(1, flatten));
  return previewHeight + (targetHeight - previewHeight) * t;
}

export function finishExternalViewport(canvas, viewport, dpr, env = globalThis) {
  const width = env.innerWidth,
    height = env.innerHeight;
  if (!(width > 0 && height > 0) || (width === viewport.width && height === viewport.height))
    return viewport;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  return { width, height };
}
