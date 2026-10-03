import html2canvas from "./vendor/html2canvas-pro.esm.js";

export function awaitCaptureReady(promise, signal, timeout = 3000) {
  return new Promise((resolve, reject) => {
    let timer;
    const clean = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      clean();
      reject(new Error("Portfolio capture cancelled"));
    };
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => {
      clean();
      reject(new Error("Portfolio capture is not ready"));
    }, timeout);
    Promise.resolve(promise).then(
      (value) => {
        clean();
        resolve(value);
      },
      (error) => {
        clean();
        reject(error);
      },
    );
  });
}

export function captureDimensions(
  width,
  height,
  pageHeight,
  dpr,
  maxTextureSize = 4096,
) {
  const captureHeight = Math.max(height, Math.min(pageHeight, height * 3));
  return {
    width,
    height: captureHeight,
    scale: Math.min(
      dpr || 1,
      2,
      maxTextureSize / width,
      maxTextureSize / captureHeight,
    ),
  };
}

// Transfer the CSS already styling the real page. Safari's capture clone must
// not race a second external stylesheet request.
export function loadedStylesheets(doc) {
  return [...doc.querySelectorAll('link[rel="stylesheet"]')]
    .map((link) => {
      if (
        link.disabled ||
        new URL(link.href).origin !== new URL(doc.baseURI).origin
      )
        return null;
      const rules = link.sheet?.cssRules;
      if (!rules?.length) throw new Error("Portfolio stylesheet is not ready");
      return {
        href: link.href,
        media: link.media,
        css: [...rules].map((rule) => rule.cssText).join("\n"),
      };
    })
    .filter(Boolean);
}

export function inlineStylesheets(doc, styles) {
  for (const source of styles) {
    const links = [...doc.querySelectorAll('link[rel="stylesheet"]')].filter(
      (link) => link.href === source.href,
    );
    if (!links.length)
      throw new Error("Portfolio stylesheet is missing from capture");
    for (const link of links) {
      const style = doc.createElement("style");
      style.textContent = source.css;
      if (source.media) style.media = source.media;
      link.replaceWith(style);
    }
  }
}

export function validateCaptureStyles(doc, expected) {
  const view = doc.defaultView;
  const hidden = doc.querySelector("h1.sr-only");
  const nav = doc.querySelector('nav[aria-label="Primary navigation"]');
  const wrapper = doc.querySelector("main > div");
  if (!view || !hidden || !nav || !wrapper)
    throw new Error("Portfolio capture structure is incomplete");
  const h = view.getComputedStyle(hidden),
    n = view.getComputedStyle(nav),
    b = view.getComputedStyle(doc.body);
  const bounds = wrapper.getBoundingClientRect();
  const width = bounds.width;
  if (
    h.position !== "absolute" ||
    h.width !== "1px" ||
    h.height !== "1px" ||
    n.display !== expected.navigationDisplay ||
    b.fontFamily !== expected.fontFamily ||
    Math.abs(width - expected.wrapperWidth) > 2 ||
    Math.abs(bounds.left - expected.wrapperLeft) > 2
  ) {
    throw new Error(
      "Portfolio capture styling does not match the landing page",
    );
  }
}

export async function capturePortfolio({ signal, maxTextureSize = 4096 } = {}) {
  signal?.throwIfAborted();
  await awaitCaptureReady(document.fonts.ready, signal);
  await awaitCaptureReady(
    new Promise((resolve) => requestAnimationFrame(resolve)),
    signal,
  );
  signal?.throwIfAborted();
  const surface = document.querySelector("[data-portfolio-surface]");
  const wrapper = surface?.querySelector("main > div");
  const nav = surface?.querySelector('nav[aria-label="Primary navigation"]');
  if (!surface || !wrapper || !nav)
    throw new Error("Portfolio content unavailable");
  const styles = loadedStylesheets(document);
  if (!styles.length) throw new Error("Portfolio stylesheet unavailable");
  const expected = {
    fontFamily: getComputedStyle(document.body).fontFamily,
    navigationDisplay: getComputedStyle(nav).display,
    wrapperWidth: wrapper.getBoundingClientRect().width,
    wrapperLeft: wrapper.getBoundingClientRect().left,
  };
  const rootStyle = getComputedStyle(document.documentElement);
  const gutter = rootStyle.scrollbarGutter;
  const rootOverflow = rootStyle.overflow;
  const viewportWidth = innerWidth;
  const width = Math.round(surface.getBoundingClientRect().width),
    viewportHeight = innerHeight;
  const themeDark = document.documentElement.classList.contains("dark");
  const dimensions = captureDimensions(
    width,
    viewportHeight,
    surface.scrollHeight,
    devicePixelRatio,
    maxTextureSize,
  );
  const container = document.createElement("div");
  container.setAttribute("data-html2canvas-ignore", "true");
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);
  let canvas;
  try {
    canvas = await awaitCaptureReady(
      html2canvas(surface, {
        ...dimensions,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 8000,
        allowTaint: false,
        signal,
        iframeContainer: container,
        async onclone(doc) {
          inlineStylesheets(doc, styles);
          doc.documentElement.style.scrollbarGutter = gutter;
          doc.documentElement.style.overflow = rootOverflow;
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
            '* { animation: none !important; transition: none !important; } [data-portfolio-surface] { visibility: visible !important; opacity: 1 !important; transform: none !important; clip-path: none !important; } [data-portfolio-surface] [style*="opacity"] { opacity: 1 !important; transform: none !important; }';
          doc.head.appendChild(style);
          doc.body.getBoundingClientRect();
          await awaitCaptureReady(doc.fonts.ready, signal);
          signal?.throwIfAborted();
          validateCaptureStyles(doc, expected);
        },
      }),
      signal,
      12000,
    );
  } finally {
    container.remove();
  }
  signal?.throwIfAborted();
  canvas.naturalWidth = canvas.width;
  canvas.naturalHeight = canvas.height;
  canvas.cssWidth = width;
  canvas.viewportWidth = viewportWidth;
  canvas.viewportHeight = viewportHeight;
  canvas.themeDark = themeDark;
  return canvas;
}
