import { factoryEscapeAllowed } from "./factory-session";

const LOCAL_ESCAPE_CONTROL =
  'input, textarea, select, video, audio, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="listbox"], [role="menu"], [data-escape-local]';
const ESCAPE_LAYER =
  'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]';

function isElement(value: unknown): value is Element {
  return !!value && typeof value === "object" && (value as Node).nodeType === 1;
}

export function activeEscapeLayer(element: Element, document: Document): boolean {
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

function localConsumerOwnsEscape(event: KeyboardEvent, document: Document): boolean {
  const target = event.composedPath().find(isElement) ?? event.target;
  if (isElement(target) && target.closest(LOCAL_ESCAPE_CONTROL)) return true;
  if (document.fullscreenElement) return true;
  const layers = Array.from(document.querySelectorAll(ESCAPE_LAYER));
  try {
    layers.push(...document.querySelectorAll(":popover-open"));
  } catch {
    // Older browsers do not expose the popover selector.
  }
  return layers.some((layer) => activeEscapeLayer(layer, document));
}

/** Own only an unclaimed Escape from the same settled factory visit. */
export function listenForFactoryReturn({
  window,
  document,
  getVisit,
  onReturn,
  enqueue = queueMicrotask,
}: {
  window: Pick<Window, "addEventListener" | "removeEventListener">;
  document: Document;
  getVisit: () => string | null;
  onReturn: () => void;
  enqueue?: (callback: () => void) => void;
}) {
  let disposed = false;
  let pendingVisit: string | null = null;
  const escape = (event: KeyboardEvent) => {
    const visit = getVisit();
    if (
      disposed ||
      !visit ||
      !factoryEscapeAllowed({
        key: event.key,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.isComposing,
        repeat: event.repeat,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        controlOwnsEscape: false,
        overlayOpen: false,
      }) ||
      localConsumerOwnsEscape(event, document)
    )
      return;

    // The window bubble phase follows controls and document listeners. Prevent
    // native Escape's stop-loading action before the deck starts loading again.
    event.preventDefault();
    if (pendingVisit === visit) return;
    pendingVisit = visit;
    enqueue(() => {
      if (disposed || pendingVisit !== visit) return;
      pendingVisit = null;
      if (getVisit() !== visit) return;
      onReturn();
    });
  };
  window.addEventListener("keydown", escape);
  return () => {
    disposed = true;
    pendingVisit = null;
    window.removeEventListener("keydown", escape);
  };
}

export type DeckEscapePhase = "entering" | "expanded" | "locked" | null;

/** Listen outside the dialog so a disabled control falling to body cannot lose Escape. */
export function listenForDeckEscape({
  window,
  getPhase,
  onCancel,
  onExit,
  onSkip,
}: {
  window: Pick<Window, "addEventListener" | "removeEventListener">;
  getPhase: () => DeckEscapePhase;
  onCancel: () => void;
  onExit: () => void;
  onSkip: () => void;
}) {
  const escape = (event: KeyboardEvent) => {
    const phase = getPhase();
    if (
      !phase ||
      !factoryEscapeAllowed({
        key: event.key,
        repeat: event.repeat,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.isComposing,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        controlOwnsEscape: false,
        overlayOpen: false,
      })
    )
      return;
    event.preventDefault();
    if (phase === "entering") onCancel();
    else if (phase === "expanded") onExit();
    else onSkip();
  };
  window.addEventListener("keydown", escape);
  return () => window.removeEventListener("keydown", escape);
}
