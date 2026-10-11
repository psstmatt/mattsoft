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

function environment() {
  const window = new EventTarget();
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
    }
    expect(env.returns).toBe(2);
    env.stop();
  });

  it("preserves an earlier consumer and focused native/input control priority", () => {
    const env = environment();
    const claimed = key();
    claimed.preventDefault();
    env.window.dispatchEvent(claimed);
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
    env.setFullScreen(element());
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(0);
    env.stop();
  });

  it("keeps the listener stable while rejecting deck/direct visits and reading the newest page", () => {
    const env = environment();
    env.setVisit(null);
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(0);
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
      { isComposing: true },
      { key: "Enter" },
    ])
      env.window.dispatchEvent(key(undefined, properties));
    expect(env.tasks).toHaveLength(0);
    env.window.dispatchEvent(key());
    env.window.dispatchEvent(key());
    expect(env.tasks).toHaveLength(1);
    env.flush();
    expect(env.returns).toBe(1);
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
