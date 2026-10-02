import html2canvas from "./vendor/html2canvas-pro.esm.js";

// Capture the exact landing viewport, at its current theme and font metrics.
// No full-page auto-scroll or color treatment is applied to the page texture.
export async function capturePortfolio() {
  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const surface = document.querySelector("[data-portfolio-surface]");
  if (!surface) throw new Error("Portfolio content unavailable");
  const background = getComputedStyle(document.body).backgroundColor;
  const canvas = await html2canvas(document.body, {
    backgroundColor: background,
    width: innerWidth,
    height: innerHeight,
    windowWidth: innerWidth,
    windowHeight: innerHeight,
    scrollX: 0,
    scrollY: 0,
    scale: Math.min(devicePixelRatio || 1, 2),
    logging: false,
    imageTimeout: 8000,
    allowTaint: false,
    onclone(doc) {
      doc.documentElement.classList.remove(
        "computer-entry",
        "computer-handover",
        "entrance-active",
      );
      doc
        .querySelectorAll("[data-computer-entrance], [data-rainbow]")
        .forEach((node) => node.remove());
      const style = doc.createElement("style");
      style.textContent =
        '* { animation: none !important; transition: none !important; } [data-portfolio-surface] { visibility: visible !important; transform: none !important; clip-path: none !important; } [data-portfolio-surface] [style*="opacity"] { opacity: 1 !important; transform: none !important; }';
      doc.head.appendChild(style);
    },
  });
  canvas.naturalWidth = canvas.width;
  canvas.naturalHeight = canvas.height;
  return canvas;
}
