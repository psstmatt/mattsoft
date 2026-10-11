import { describe, expect, it } from "bun:test";
import {
  activeEscapeLayer,
  listenForFactoryReturn,
  listenForDeckEscape,
  type DeckEscapePhase,
} from "../src/lib/factory-escape";

function element(
  options: {
    hidden?: boolean;
    inert?: boolean;
    disconnected?: boolean;
    noLayout?: boolean;
    control?: boolean;
    display?: string;
    visibility?: string;
    opacity?: string;
  } = {},
) {
  const node = {
    nodeType: 1,
    isConnected: !options.disconnected,
    parentElement: null,
    closest(selector: string) {
      if (selector.startsWith("[hidden]")) return options.hidden || options.inert ? node : null;
      return options.control ? node : null;
    },
    getClientRects: () => (options.noLayout ? [] : [{ width: 200, height: 120 }]),
    style: {
      display: options.display ?? "block",
      visibility: options.visibility ?? "visible",
      opacity: options.opacity ?? "1",
    },
  };
  return node as unknown as Element;
}

/** Model window capture -> app handling -> window bubble, including same-event removal. */
class EscapeWindow {
  private listeners: { type: string; callback: EventListener; capture: boolean }[] = [];

  addEventListener(type: string, callback: EventListener, capture = false) {
    this.listeners.push({ type, callback, capture });
  }

  removeEventListener(type: string, callback: EventListener, capture = false) {
    this.listeners = this.listeners.filter(
      (listener) =>
        listener.type !== type || listener.callback !== callback || listener.capture !== capture,
    );
  }

  dispatchEvent(event: Event, appHandler: (event: Event) => void = () => {}) {
    const listeners = this.listeners.filter((listener) => listener.type === event.type);
    listeners
      .filter((listener) => listener.capture)
      .forEach((listener) => listener.callback(event));
    appHandler(event);
    if (!event.cancelBubble)
      listeners
        .filter((listener) => !listener.capture)
        .forEach((listener) => listener.callback(event));
    return !event.defaultPrevented;
  }
}

function environment({ local = true } = {}) {
  const window = new EscapeWindow();
  const tasks: (() => void)[] = [];
  let visit: string | null = "session:portfolio:entry-1";
  let returns = 0;
  let layers: Element[] = [];
  let fullScreen: Element | null = null;
  const document = {
    get fullscreenElement() {
      return fullScreen;
    },
    querySelectorAll: (selector: string) => (selector === ":popover-open" ? [] : layers),
    defaultView: { getComputedStyle: (node: { style: object }) => node.style },
  } as unknown as Document;
  const stop = listenForFactoryReturn({
    window: window as unknown as Window,
    document,
    getVisit: () => visit,
    onReturn: () => {
      returns++;
      // Same-document returns do not have pagehide/pageshow to clear the latch.
      return local ? false : undefined;
    },
    enqueue: (callback) => tasks.push(callback),
  });
  return {
    window,
    document,
    stop,
    tasks,
    setVisit: (next: string | null) => {
      visit = next;
    },
    setLayers: (next: Element[]) => {
      layers = next;
    },
    setFullScreen: (next: Element | null) => {
      fullScreen = next;
    },
    get returns() {
      return returns;
    },
    flush: () => {
      tasks.splice(0).forEach((callback) => callback());
    },
    release: () => {
      const event = new Event("keyup");
      Object.assign(event, { key: "Escape" });
      window.dispatchEvent(event);
    },
  };
}

function key(target?: Element, properties: object = {}) {
  const event = new Event("keydown", { bubbles: true, cancelable: true });
  Object.assign(event, {
    key: "Escape",
    repeat: false,
    isComposing: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    ...properties,
  });
  if (target) Object.defineProperty(event, "composedPath", { value: () => [target] });
  return event;
}

describe("settled factory-page Escape", () => {
  it("claims native Escape before returning and works from ordinary content or body focus", () => {
    const env = environment();
    for (const target of [undefined, element()]) {
      const event = key(target);
      env.window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(env.tasks).toHaveLength(1);
      env.flush();
      env.release();
    }
    expect(env.returns).toBe(2);
    env.stop();
  });

  it("preserves an earlier consumer and focused native/input control priority", () => {
    const env = environment();
    const claimed = key();
    claimed.preventDefault();
    env.window.dispatchEvent(claimed);
    env.release();
    const input = key(element({ control: true }));
    env.window.dispatchEvent(input);
    expect(input.defaultPrevented).toBe(false);
    expect(env.tasks).toHaveLength(0);
    env.stop();
  });

  it("defers to visible active modals and fullscreen, but ignores hidden/inert/stale layers", () => {
    const env = environment();
    env.setLayers([element()]);
    const modalEvent = key();
    env.window.dispatchEvent(modalEvent);
    expect(modalEvent.defaultPrevented).toBe(false);
    expect(env.tasks).toHaveLength(0);
    env.release();
    env.setLayers([
      element({ hidden: true }),
      element({ inert: true }),
      element({ disconnected: true }),
      element({ noLayout: true }),
      element({ display: "none" }),
      element({ visibility: "hidden" }),
      element({ opacity: "0" }),
    ]);
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(1);
    env.release();
    env.setFullScreen(element());
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(0);
    env.release();
    env.stop();
  });

  it("keeps the listener stable while rejecting deck/direct visits and reading the newest page", () => {
    const env = environment();
    env.setVisit(null);
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(0);
    env.release();
    env.setVisit("session:scout:entry-2");
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(1);
    env.stop();
  });

  it("invalidates queued return on navigation or listener teardown", () => {
    const env = environment();
    env.window.dispatchEvent(key());
    env.setVisit("session:portfolio:entry-2");
    env.flush();
    expect(env.returns).toBe(0);
    env.release();
    env.window.dispatchEvent(key());
    env.stop();
    env.flush();
    expect(env.returns).toBe(0);
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(0);
  });

  it("ignores held/modifier/composition keys and queues only one return for the same visit", () => {
    const env = environment();
    for (const properties of [
      { repeat: true },
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { shiftKey: true },
      { isComposing: true },
      { key: "Enter" },
    ]) {
      env.window.dispatchEvent(key(undefined, properties));
      env.release();
    }
    expect(env.tasks).toHaveLength(0);
    env.window.dispatchEvent(key());
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(1);
    env.flush();
    expect(env.returns).toBe(1);
    env.stop();
  });

  it("returns across two local Portfolio visits without requiring a document lifecycle event", () => {
    const env = environment();
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(1);
    env.setVisit(null); // The same document is now displaying the deck.
    env.release();
    env.setVisit("session:portfolio:entry-2");
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(2);
    env.stop();
  });

  it("does not return when a modal removes itself during this same Escape", () => {
    const env = environment();
    env.setLayers([element()]);
    const closing = key();
    env.window.dispatchEvent(closing, () => env.setLayers([]));
    env.flush();
    expect(closing.defaultPrevented).toBe(false);
    expect(env.returns).toBe(0);
    env.release();
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(1);
    env.stop();
  });

  it("captures local ownership before fullscreen exits and defers to app preventDefault", () => {
    const env = environment();
    env.setFullScreen(element());
    env.window.dispatchEvent(key(), () => env.setFullScreen(null));
    env.release();
    env.window.dispatchEvent(key(), (event) => event.preventDefault());
    env.flush();
    expect(env.returns).toBe(0);
    env.stop();
  });

  it("keeps a held consumed Escape local until release", () => {
    const env = environment();
    env.window.dispatchEvent(key(element({ control: true })));
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(0);
    env.release();
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(1);
    env.stop();
  });

  it("latches cross-document navigation and resets safely after BFCache pageshow", () => {
    const env = environment({ local: false });
    env.window.dispatchEvent(key());
    env.flush();
    env.release();
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(1);
    env.window.dispatchEvent(new Event("pagehide"));
    env.window.dispatchEvent(new Event("pageshow"));
    env.window.dispatchEvent(key());
    env.flush();
    expect(env.returns).toBe(2);
    env.stop();
  });

  it("cancels a queued return when pagehide precedes its callback", () => {
    const env = environment();
    env.window.dispatchEvent(key());
    env.window.dispatchEvent(new Event("pagehide"));
    env.flush();
    expect(env.returns).toBe(0);
    env.stop();
  });

  it("treats hidden ancestors as inactive even when the layer has a layout box", () => {
    const env = environment();
    const parent = element({ visibility: "hidden" });
    const child = element();
    Object.defineProperty(child, "parentElement", { value: parent });
    expect(activeEscapeLayer(child, env.document)).toBe(false);
    env.stop();
  });
});

describe("in-flight and idle deck Escape", () => {
  it("cancels every renderer from body focus before any exit/skip action", () => {
    for (const machine of ["portfolio", "scout", "references", "anduril"]) {
      const window = new EventTarget();
      let phase: DeckEscapePhase = "entering";
      const actions: string[] = [];
      const stop = listenForDeckEscape({
        window: window as unknown as Window,
        getPhase: () => phase,
        onCancel: () => {
          actions.push(`cancel:${machine}`);
          phase = "expanded";
        },
        onExit: () => {
          actions.push("exit");
          phase = "locked";
        },
        onSkip: () => actions.push("skip"),
      });
      const cancel = key();
      window.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(true);
      expect(actions).toEqual([`cancel:${machine}`]);
      window.dispatchEvent(key(undefined, { repeat: true }));
      expect(actions).toHaveLength(1);
      window.dispatchEvent(key());
      expect(actions).toEqual([`cancel:${machine}`, "exit"]);
      window.dispatchEvent(key());
      expect(actions.at(-1)).toBe("skip");
      stop();
      window.dispatchEvent(key());
      expect(actions).toHaveLength(3);
    }
  });
  it("does not handle an inactive deck or already-consumed event", () => {
    const window = new EventTarget();
    let phase: DeckEscapePhase = null;
    let calls = 0;
    const stop = listenForDeckEscape({
      window: window as unknown as Window,
      getPhase: () => phase,
      onCancel: () => calls++,
      onExit: () => calls++,
      onSkip: () => calls++,
    });
    window.dispatchEvent(key());
    phase = "entering";
    const claimed = key();
    claimed.preventDefault();
    window.dispatchEvent(claimed);
    expect(calls).toBe(0);
    stop();
  });
});
