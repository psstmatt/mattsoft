/** Per-tab factory state. A URL never grants an earned Konami unlock. */
export type FactorySnapshot = { unlocked: boolean; active: number; expanded: boolean };
export type FactoryView = "deck" | "portfolio";

export const FACTORY_STORAGE_KEY = "computer-factory-session:v1";
export const FACTORY_HISTORY_KEY = "__computerFactoryV1";
export const FACTORY_SESSION_MS = 6 * 60 * 60 * 1000;

export type FactorySession = {
  version: 1;
  id: string;
  createdAt: number;
  rootHref: string;
  snapshot: FactorySnapshot;
};

type FactoryMarker = { id: string; view: FactoryView; snapshot?: FactorySnapshot };
type StorageLike = Pick<Storage, "getItem" | "setItem">;

const views = ["deck", "portfolio"];

/** Only the homepage owns an entrance. Screen captures bypass it. */
export function factoryEntryRoot(pathname: string, search: string): string | null {
  if (pathname !== "/" || new URLSearchParams(search).has("screen")) return null;
  return "/";
}

export function isFactorySnapshot(value: unknown): value is FactorySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as FactorySnapshot;
  return (
    typeof snapshot.unlocked === "boolean" &&
    typeof snapshot.expanded === "boolean" &&
    Number.isInteger(snapshot.active) &&
    snapshot.active >= 0 &&
    snapshot.active < 4 &&
    (snapshot.unlocked || (!snapshot.expanded && snapshot.active === 0))
  );
}

export function parseFactorySession(raw: string | null, now = Date.now()): FactorySession | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const value = JSON.parse(raw) as FactorySession;
    if (
      value.version !== 1 ||
      typeof value.id !== "string" ||
      !/^[a-zA-Z0-9-]{8,64}$/.test(value.id) ||
      !Number.isFinite(value.createdAt) ||
      value.createdAt > now ||
      now - value.createdAt > FACTORY_SESSION_MS ||
      typeof value.rootHref !== "string" ||
      value.rootHref.length > 1024 ||
      !isFactorySnapshot(value.snapshot)
    )
      return null;
    const root = new URL(value.rootHref, "https://factory.invalid");
    if (
      root.origin !== "https://factory.invalid" ||
      root.pathname !== "/" ||
      root.search !== "" ||
      root.hash !== ""
    )
      return null;
    return {
      version: 1,
      id: value.id,
      createdAt: value.createdAt,
      rootHref: `${root.pathname}${root.search}${root.hash}`,
      snapshot: { ...value.snapshot },
    };
  } catch {
    return null;
  }
}

export function factoryBrowserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readFactorySession(storage: StorageLike | null, now = Date.now()) {
  try {
    return parseFactorySession(storage?.getItem(FACTORY_STORAGE_KEY) ?? null, now);
  } catch {
    return null;
  }
}

export function saveFactorySession(storage: StorageLike | null, session: FactorySession) {
  try {
    storage?.setItem(FACTORY_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Returning still works in memory when browser storage is unavailable.
  }
}

export function factoryHistoryState(state: object, session: FactorySession, view: FactoryView) {
  return {
    ...state,
    [FACTORY_HISTORY_KEY]: { id: session.id, view, snapshot: { ...session.snapshot } },
  };
}

export function factoryViewFromHistory(
  state: unknown,
  session: FactorySession | null,
): FactoryView | null {
  if (!session || !state || typeof state !== "object") return null;
  const marker = (state as Record<string, unknown>)[FACTORY_HISTORY_KEY] as
    FactoryMarker | undefined;
  return marker?.id === session.id && views.includes(marker.view) ? marker.view : null;
}

/** A page returns to its own origin, even after newer visits changed the shared selection. */
export function factorySessionFromHistory(state: unknown, session: FactorySession): FactorySession {
  const view = factoryViewFromHistory(state, session);
  if (!view || view === "deck") return session;
  const marker = (state as Record<string, unknown>)[FACTORY_HISTORY_KEY] as FactoryMarker;
  const origin = isFactorySnapshot(marker.snapshot) ? marker.snapshot : session.snapshot;
  return {
    ...session,
    snapshot: {
      ...origin,
      // Visiting an earlier locked Portfolio entry must not revoke an earned unlock.
      unlocked: session.snapshot.unlocked || origin.unlocked,
    },
  };
}

export function factoryLocalRoute(pathname: string) {
  return ["/", "/about", "/catalog"].includes(pathname) || pathname.startsWith("/work/");
}

/** Only forward local navigation inherits a factory visit. Back never invents one. */
export function factoryNavigationView({
  state,
  session,
  currentView,
  action,
  pathname,
}: {
  state: unknown;
  session: FactorySession | null;
  currentView: FactoryView | null;
  action: string;
  pathname: string;
}): FactoryView | null {
  const saved = factoryViewFromHistory(state, session);
  if (saved) return saved;
  return session &&
    currentView === "portfolio" &&
    (action === "PUSH" || action === "REPLACE") &&
    factoryLocalRoute(pathname)
    ? "portfolio"
    : null;
}

export function factoryEscapeAllowed({
  key,
  defaultPrevented,
  isComposing,
  repeat,
  ctrlKey,
  altKey,
  metaKey,
  controlOwnsEscape,
  overlayOpen,
}: {
  key: string;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  repeat?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  controlOwnsEscape: boolean;
  overlayOpen: boolean;
}) {
  return (
    key === "Escape" &&
    !defaultPrevented &&
    !isComposing &&
    !repeat &&
    !ctrlKey &&
    !altKey &&
    !metaKey &&
    !controlOwnsEscape &&
    !overlayOpen
  );
}
