const CONTROL =
  'input, textarea, select, video, audio, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [data-escape-local]';
const LAYERS =
  'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"], [data-escape-layer]';
const isElement = (value: unknown): value is Element =>
  !!value && typeof value === "object" && (value as Node).nodeType === 1;

function activeLayer(element: Element, document: Document) {
  if (
    !element.isConnected ||
    element.closest('[hidden], [inert], [aria-hidden="true"], [data-state="closed"]') ||
    !Array.from(element.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0)
  )
    return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = document.defaultView?.getComputedStyle(node);
    if (
      style?.display === "none" ||
      style?.visibility === "hidden" ||
      style?.visibility === "collapse" ||
      style?.opacity === "0"
    )
      return false;
  }
  return true;
}

function localOwner(event: KeyboardEvent, document: Document) {
  if (document.fullscreenElement || document.pointerLockElement) return true;
  const path = event.composedPath();
  if (path.some((node) => isElement(node) && node.closest(CONTROL))) return true;
  if (isElement(document.activeElement) && document.activeElement.closest(CONTROL)) return true;
  const layers = Array.from(document.querySelectorAll(LAYERS));
  try {
    layers.push(...document.querySelectorAll(":popover-open"));
  } catch {
    /* Older browsers. */
  }
  return layers.some((layer) => activeLayer(layer, document));
}

function plain(event: KeyboardEvent) {
  return (
    event.key === "Escape" &&
    !event.repeat &&
    !event.isComposing &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

/** Install capture before app listeners where possible; capture never consumes an event. */
export function listenForCooperativeEscape({
  window,
  document,
  getVisit,
  onReturn,
  enqueue = queueMicrotask,
}: {
  window: Pick<Window, "addEventListener" | "removeEventListener">;
  document: Document;
  getVisit: () => string | null;
  /** Return false to release the navigation latch when no navigation was started. */
  onReturn: () => void | boolean;
  enqueue?: (callback: () => void) => void;
}) {
  let disposed = false;
  let down = false;
  let inFlight = false;
  let generation = 0;
  const owners = new WeakMap<Event, boolean>();
  const capture = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    owners.set(event, down || !plain(event) || localOwner(event, document));
    down = true;
  };
  const keyup = (event: KeyboardEvent) => {
    if (event.key === "Escape") down = false;
  };
  const reset = () => {
    down = false;
    inFlight = false;
    generation++;
  };
  const escape = (event: KeyboardEvent) => {
    if (
      disposed ||
      inFlight ||
      !plain(event) ||
      event.defaultPrevented ||
      owners.get(event) !== false ||
      localOwner(event, document)
    )
      return;
    const visit = getVisit();
    if (!visit) return;
    event.preventDefault();
    inFlight = true;
    const attempt = ++generation;
    enqueue(() => {
      if (disposed || generation !== attempt) return;
      if (getVisit() !== visit) {
        inFlight = false;
        return;
      }
      try {
        if (onReturn() === false) inFlight = false;
      } catch {
        inFlight = false;
      }
    });
  };
  window.addEventListener("keydown", capture as EventListener, true);
  window.addEventListener("keydown", escape as EventListener);
  window.addEventListener("keyup", keyup as EventListener, true);
  window.addEventListener("blur", reset);
  window.addEventListener("pagehide", reset);
  window.addEventListener("pageshow", reset);
  return () => {
    disposed = true;
    reset();
    window.removeEventListener("keydown", capture as EventListener, true);
    window.removeEventListener("keydown", escape as EventListener);
    window.removeEventListener("keyup", keyup as EventListener, true);
    window.removeEventListener("blur", reset);
    window.removeEventListener("pagehide", reset);
    window.removeEventListener("pageshow", reset);
  };
}
