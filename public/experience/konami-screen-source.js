import { capturePortfolio, awaitCaptureReady } from "./computer-snapshot.js";

export const SCREEN_SOURCES = Object.freeze({
  scout: "/previews/scout-header-only.jpg",
  references: "/previews/references-tall.jpg",
});

export const PREVIEW_ASPECT = 1.28;

export function previewSourceDimensions(width, height, maxTextureSize = 4096) {
  const paddedHeight = Math.max(height, Math.ceil(width / PREVIEW_ASPECT));
  const scale = Math.min(1, maxTextureSize / width, maxTextureSize / paddedHeight);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(paddedHeight * scale)),
    scale,
  };
}

// Both renderers look through the same window into the complete captured page.
export function previewSampleHeight(source, external, viewportHeight) {
  const pageHeight = (source.naturalHeight * source.cssWidth) / source.naturalWidth;
  const windowHeight = external ? source.cssWidth / PREVIEW_ASPECT : viewportHeight;
  return windowHeight >= pageHeight - 1 ? 1 : windowHeight / pageHeight;
}

// Keep the original html2canvas capture for the live local destination. External
// destinations use only their verified public captures, never a placeholder.
export async function captureScreenSource({
  signal,
  kind = "portfolio",
  maxTextureSize = 4096,
} = {}) {
  signal?.throwIfAborted();
  if (kind === "portfolio") return capturePortfolio({ signal, maxTextureSize });
  const source = SCREEN_SOURCES[kind];
  if (!source) throw new Error("Unknown computer destination");
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  let bitmap;
  try {
    const response = await awaitCaptureReady(
      fetch(source, { signal: controller.signal }),
      signal,
      12000,
    );
    if (!response.ok) throw new Error("Destination preview unavailable");
    const blob = await awaitCaptureReady(response.blob(), signal, 12000);
    const decoding = createImageBitmap(blob).then((image) => {
      if (controller.signal.aborted) {
        image.close();
        throw controller.signal.reason;
      }
      return image;
    });
    bitmap = await awaitCaptureReady(decoding, signal, 12000);
    signal?.throwIfAborted();
    const canvas = document.createElement("canvas");
    const dimensions = previewSourceDimensions(bitmap.width, bitmap.height, maxTextureSize);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Destination preview canvas unavailable");
    ctx.fillStyle = kind === "references" ? "#f7f9fa" : "#0d0c0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = dimensions.scale;
    ctx.drawImage(bitmap, 0, 0, bitmap.width * scale, bitmap.height * scale);
    canvas.naturalWidth = canvas.width;
    canvas.naturalHeight = canvas.height;
    canvas.cssWidth = bitmap.width;
    canvas.viewportWidth = innerWidth;
    canvas.viewportHeight = innerHeight;
    canvas.themeDark = document.documentElement.classList.contains("dark");
    return canvas;
  } finally {
    bitmap?.close();
    controller.abort();
    signal?.removeEventListener("abort", abort);
  }
}
