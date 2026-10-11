import { describe, expect, it } from "bun:test";
import { createMemoryHistory } from "@tanstack/history";
import {
  FACTORY_HISTORY_KEY,
  FACTORY_SESSION_MS,
  FACTORY_STORAGE_KEY,
  factoryEntryRoot,
  factoryEscapeAllowed,
  factoryHistoryState,
  factoryNavigationView,
  factorySessionFromHistory,
  factoryViewFromHistory,
  parseFactorySession,
  readFactorySession,
  saveFactorySession,
  type FactorySession,
  type FactoryView,
} from "../src/lib/factory-session";

const now = 1_000_000_000;
const session: FactorySession = {
  version: 1,
  id: "test-factory-visit",
  createdAt: now,
  rootHref: "/",
  snapshot: { unlocked: true, active: 3, expanded: true },
};

describe("bounded factory session recovery", () => {
  it("starts the normal production entrance without requiring a hidden query flag", () => {
    for (const search of ["", "?deck=1", "?motion=absurd&factory=1&machine=3", "?entry=original"]) {
      const rootHref = factoryEntryRoot("/", search);
      expect(rootHref).not.toBeNull();
      const entered: FactorySession = {
        ...session,
        rootHref: rootHref!,
        snapshot: { unlocked: false, expanded: false, active: 0 },
      };
      const stored = parseFactorySession(JSON.stringify(entered), now + 1);
      expect(stored).not.toBeNull();
      expect(factoryViewFromHistory(factoryHistoryState({}, entered, "portfolio"), stored)).toBe(
        "portfolio",
      );
      expect(rootHref).toBe("/");
    }
  });

  it("does not intercept direct content visits or screen captures", () => {
    for (const path of ["/catalog", "/about", "/work/symphony", "/sound-lab"]) {
      expect(factoryEntryRoot(path, "")).toBeNull();
    }
    for (const search of ["?screen=1", "?screen=1&factory=1"]) {
      expect(factoryEntryRoot("/", search)).toBeNull();
    }
  });

  it("restores an earned selection only for a matching factory-originated history entry", () => {
    const stored = parseFactorySession(JSON.stringify(session), now + 100);
    expect(stored?.snapshot).toEqual({ unlocked: true, active: 3, expanded: true });
    expect(factoryViewFromHistory(factoryHistoryState({}, session, "portfolio"), stored)).toBe(
      "portfolio",
    );
    expect(factoryViewFromHistory({}, stored)).toBeNull();
    expect(
      factoryViewFromHistory(
        { [FACTORY_HISTORY_KEY]: { id: "another-tab", view: "deck" } },
        stored,
      ),
    ).toBeNull();
    expect(
      factoryViewFromHistory(
        { [FACTORY_HISTORY_KEY]: { id: session.id, view: "unknown" } },
        stored,
      ),
    ).toBeNull();
  });

  it("rejects stale, future, oversized, malformed, cross-origin and invalid snapshots", () => {
    expect(parseFactorySession(JSON.stringify(session), now + FACTORY_SESSION_MS + 1)).toBeNull();
    expect(parseFactorySession(JSON.stringify(session), now - 1)).toBeNull();
    expect(parseFactorySession("x".repeat(2049), now)).toBeNull();
    expect(parseFactorySession("{", now)).toBeNull();
    for (const change of [
      { version: 2 },
      { rootHref: "https://evil.example/?factory=1" },
      { rootHref: "//evil.example/?factory=1" },
      { rootHref: "/?unlocked=1" },
      { rootHref: "/?factory=1" },
      { rootHref: "/#external" },
      { snapshot: { unlocked: false, active: 3, expanded: true } },
      { snapshot: { unlocked: true, active: 4, expanded: true } },
    ])
      expect(parseFactorySession(JSON.stringify({ ...session, ...change }), now)).toBeNull();
  });

  it("round trips one storage record and tolerates unavailable browser storage", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    saveFactorySession(storage, session);
    expect([...data.keys()]).toEqual([FACTORY_STORAGE_KEY]);
    expect(readFactorySession(storage, now)).toEqual(session);
    const denied = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readFactorySession(denied, now)).toBeNull();
    expect(() => saveFactorySession(denied, session)).not.toThrow();
    expect(readFactorySession(null, now)).toBeNull();
    expect(() => saveFactorySession(null, session)).not.toThrow();
  });
});

describe("factory route, Back and Forward history", () => {
  it("keeps the same earned computer through local routes, reload, return, Back and Forward", () => {
    const history = createMemoryHistory({ initialEntries: ["/about", session.rootHref] });
    let view: FactoryView | null = "deck";
    history.replace(session.rootHref, factoryHistoryState(history.location.state, session, "deck"));
    const unsubscribe = history.subscribe(({ location, action }) => {
      view = factoryNavigationView({
        state: location.state,
        session,
        currentView: view,
        action: action.type,
        pathname: location.pathname,
      });
      if (view && !factoryViewFromHistory(location.state, session))
        history.replace(location.href, factoryHistoryState(location.state, session, view));
    });
    history.push(session.rootHref, factoryHistoryState({}, session, "portfolio"));
    history.push("/catalog");
    history.push("/work/example");
    expect(view).toBe("portfolio");
    const reloaded = parseFactorySession(JSON.stringify(session), now + 1000);
    expect(factoryViewFromHistory(history.location.state, reloaded)).toBe("portfolio");
    expect(reloaded?.snapshot.active).toBe(3);
    history.push(session.rootHref, factoryHistoryState({}, session, "deck"));
    expect(view).toBe("deck");
    history.back();
    expect(view).toBe("portfolio");
    history.forward();
    expect(view).toBe("deck");
    history.go(-5);
    expect(history.location.pathname).toBe("/about");
    expect(view).toBeNull();
    unsubscribe();
  });

  it("does not make direct visits, history exits, or unrelated tools factory visits", () => {
    for (const input of [
      { currentView: null, action: "PUSH", pathname: "/about" },
      { currentView: "portfolio", action: "BACK", pathname: "/about" },
      { currentView: "portfolio", action: "PUSH", pathname: "/sound-lab" },
    ] as const)
      expect(factoryNavigationView({ state: {}, session, ...input })).toBeNull();
    expect(factoryViewFromHistory({}, session)).toBeNull();
  });

  it("retains each originating computer over repeated destination entry and return", () => {
    const history = createMemoryHistory({ initialEntries: [session.rootHref] });
    for (const active of [0, 1, 2, 3]) {
      const visit = { ...session, snapshot: { unlocked: true, active, expanded: true } };
      for (let repetition = 0; repetition < 2; repetition++) {
        const page: FactoryView = "portfolio";
        history.push(visit.rootHref, factoryHistoryState({}, visit, page));
        const restored = parseFactorySession(JSON.stringify(visit), now + repetition);
        expect(factoryViewFromHistory(history.location.state, restored)).toBe(page);
        expect(restored?.snapshot).toEqual({ unlocked: true, active, expanded: true });
        history.push(visit.rootHref, factoryHistoryState({}, visit, "deck"));
        expect(factoryViewFromHistory(history.location.state, restored)).toBe("deck");
        history.back();
        expect(factoryViewFromHistory(history.location.state, restored)).toBe(page);
        history.forward();
        expect(factoryViewFromHistory(history.location.state, restored)).toBe("deck");
      }
    }
  });

  it("returns an older Portfolio visit to its recorded selection after a newer visit", () => {
    const history = createMemoryHistory({ initialEntries: [session.rootHref] });
    let current = { ...session, snapshot: { unlocked: true, active: 1, expanded: true } };
    let view: FactoryView | null = "deck";
    history.replace(session.rootHref, factoryHistoryState({}, current, "deck"));
    const unsubscribe = history.subscribe(({ location, action }) => {
      view = factoryNavigationView({
        state: location.state,
        session: current,
        currentView: view,
        action: action.type,
        pathname: location.pathname,
      });
      if (view) current = factorySessionFromHistory(location.state, current);
    });
    history.push(session.rootHref, factoryHistoryState({}, current, "portfolio"));
    const scoutHistory = history.location.state;
    history.push(session.rootHref, factoryHistoryState({}, current, "deck"));
    current = { ...current, snapshot: { ...current.snapshot, active: 2 } };
    history.push(session.rootHref, factoryHistoryState({}, current, "portfolio"));
    history.push(session.rootHref, factoryHistoryState({}, current, "deck"));
    const savedAfterReferences = JSON.stringify(current);
    history.go(-3);
    expect(view).toBe("portfolio");
    expect(current.snapshot.active).toBe(1);
    // The same recovery applies when reloading that older page before pressing Escape.
    const reloaded = parseFactorySession(savedAfterReferences, now + 1000)!;
    expect(factorySessionFromHistory(scoutHistory, reloaded).snapshot.active).toBe(1);
    history.push(session.rootHref, factoryHistoryState({}, current, "deck"));
    expect(view).toBe("deck");
    expect(current.snapshot).toEqual({ unlocked: true, active: 1, expanded: true });
    unsubscribe();
  });

  it("keeps Portfolio's recorded origin across routes without revoking a later unlock", () => {
    const locked = { ...session, snapshot: { unlocked: false, active: 0, expanded: false } };
    const portfolioHistory = factoryHistoryState({}, locked, "portfolio");
    const returned = factorySessionFromHistory(portfolioHistory, session);
    expect(returned.snapshot).toEqual({ unlocked: true, active: 0, expanded: false });
    const routedHistory = factoryHistoryState({}, returned, "portfolio");
    expect(factorySessionFromHistory(routedHistory, session).snapshot.active).toBe(0);
    // A skip to Portfolio may originate from another active computer; preserve it exactly.
    const skippedFromScout = {
      ...session,
      snapshot: { unlocked: true, active: 1, expanded: true },
    };
    const skippedHistory = factoryHistoryState({}, skippedFromScout, "portfolio");
    expect(factorySessionFromHistory(skippedHistory, session).snapshot.active).toBe(1);
    expect(
      factorySessionFromHistory(factoryHistoryState({}, locked, "deck"), session).snapshot,
    ).toEqual({
      unlocked: true,
      active: 0,
      expanded: false,
    });
  });

  it("restores an older Scout deck after a newer References visit without BFCache", () => {
    const scout = { ...session, snapshot: { unlocked: true, active: 1, expanded: true } };
    const references = { ...session, snapshot: { unlocked: true, active: 2, expanded: true } };
    const oldDeck = factoryHistoryState({ __TSR_key: "scout-departure" }, scout, "deck");
    // A full document reload sees the latest per-tab storage and the older entry's history.
    const stored = parseFactorySession(JSON.stringify(references), now + 1000)!;
    expect(factorySessionFromHistory(oldDeck, stored).snapshot).toEqual(scout.snapshot);
    const newDeck = factoryHistoryState({ __TSR_key: "references-departure" }, references, "deck");
    expect(factorySessionFromHistory(newDeck, stored).snapshot).toEqual(references.snapshot);
  });

  it("keeps the current deck marker synchronized through selection, collapse, reload and Back", () => {
    const history = createMemoryHistory({ initialEntries: [session.rootHref] });
    let current = { ...session, snapshot: { unlocked: true, active: 0, expanded: true } };
    history.replace(session.rootHref, factoryHistoryState(history.location.state, current, "deck"));
    current = { ...current, snapshot: { ...current.snapshot, active: 1 } };
    history.replace(session.rootHref, factoryHistoryState(history.location.state, current, "deck"));
    const selected = factorySessionFromHistory(
      history.location.state,
      parseFactorySession(JSON.stringify(current), now + 1000)!,
    );
    expect(selected.snapshot.active).toBe(1);
    history.push(session.rootHref, factoryHistoryState({}, current, "portfolio"));
    history.push(session.rootHref, factoryHistoryState({}, current, "deck"));
    current = { ...current, snapshot: { unlocked: true, active: 0, expanded: false } };
    history.replace(session.rootHref, factoryHistoryState(history.location.state, current, "deck"));
    const collapsed = factorySessionFromHistory(history.location.state, current);
    expect(collapsed.snapshot).toEqual({ unlocked: true, active: 0, expanded: false });
    history.go(-2);
    expect(factorySessionFromHistory(history.location.state, current).snapshot).toEqual({
      unlocked: true,
      active: 1,
      expanded: true,
    });
  });

  it("ignores external or mismatched history markers", () => {
    for (const marker of [
      { id: session.id, view: "scout" },
      {
        id: "different-session",
        view: "portfolio",
        snapshot: { unlocked: true, active: 1, expanded: true },
      },
    ]) {
      expect(factoryViewFromHistory({ [FACTORY_HISTORY_KEY]: marker }, session)).toBeNull();
      expect(factorySessionFromHistory({ [FACTORY_HISTORY_KEY]: marker }, session)).toBe(session);
    }
  });
});

describe("Escape return precedence", () => {
  const plain = { key: "Escape", controlOwnsEscape: false, overlayOpen: false };
  it("returns only for an unclaimed plain Escape", () => {
    expect(factoryEscapeAllowed(plain)).toBe(true);
    for (const change of [
      { key: "Enter" },
      { defaultPrevented: true },
      { isComposing: true },
      { repeat: true },
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { controlOwnsEscape: true },
      { overlayOpen: true },
    ])
      expect(factoryEscapeAllowed({ ...plain, ...change })).toBe(false);
  });
});
