/** Public navigation continuity only. This is not authentication or authorization. */
export type DestinationId = "scout" | "references" | "anduril";
export type Snapshot = { unlocked: boolean; active: number; expanded: boolean };
export type FactorySession = { id: string; createdAt: number; snapshot: Snapshot };
export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type HistoryLike = Pick<History, "state" | "replaceState">;
export type BridgeConfig = {
  /** Build-time configuration only. Never populate this from location/referrer. */
  factories: Readonly<Record<string, string>>;
  lifetimeMs?: number;
};
export const DEFAULT_CONFIG: BridgeConfig = {
  factories: Object.freeze({ production: "https://psstmatt.com" }),
};
export const DESTINATIONS: Readonly<Record<DestinationId, string>> = Object.freeze({
  scout: "https://scout.psstmatt.com",
  references: "https://references.psstmatt.com",
  anduril: "https://anduril.psstmatt.com",
});
export const ORIGIN_STORAGE_KEY = "factory-travel-origin:v1";
export const DESTINATION_STORAGE_KEY = "factory-travel-destination:v1";
export const DESTINATION_HISTORY_KEY = "__factoryTravelV1";
export const DEFAULT_LIFETIME_MS = 30 * 60 * 1000;
export const MAX_RECORDS = 16;
const MAX_SESSION_MS = 6 * 60 * 60 * 1000;
const MAX_STORAGE_LENGTH = 32768;
const ENTRY = "__factory_entry";
const RETURN = "__factory_return";
const NONCE = /^[A-Za-z0-9_-]{22}$/;
const FACTORY_ID = /^[a-z][a-z0-9-]{0,47}$/;
const TIMESTAMP = /^(0|[1-9][0-9]{0,15})$/;

export type Visit = {
  version: 1;
  nonce: string;
  factoryId: string;
  destinationId: DestinationId;
  issuedAt: number;
  expiresAt: number;
};
type OriginVisit = Visit & { factorySessionId: string; snapshot: Snapshot };
type HistoryMarker = Pick<Visit, "version" | "nonce" | "factoryId" | "destinationId">;
export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validSnapshot(value: unknown): value is Snapshot {
  if (!isObject(value)) return false;
  return (
    typeof value["unlocked"] === "boolean" &&
    typeof value["expanded"] === "boolean" &&
    Number.isInteger(value["active"]) &&
    (value["active"] as number) >= 0 &&
    (value["active"] as number) < 4 &&
    (value["unlocked"] || (!value["expanded"] && value["active"] === 0))
  );
}

function lifetime(config: BridgeConfig) {
  const ms = config.lifetimeMs ?? DEFAULT_LIFETIME_MS;
  return Number.isSafeInteger(ms) && ms > 0 && ms <= DEFAULT_LIFETIME_MS ? ms : 0;
}

function factoryOrigin(config: BridgeConfig, id: unknown): string | null {
  if (
    typeof id !== "string" ||
    !FACTORY_ID.test(id) ||
    !Object.prototype.hasOwnProperty.call(config.factories, id)
  )
    return null;
  const candidate = config.factories[id];
  if (typeof candidate !== "string") return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" &&
      url.origin === candidate &&
      !url.username &&
      !url.password &&
      !url.port
      ? candidate
      : null;
  } catch {
    return null;
  }
}

function destinationId(value: unknown): value is DestinationId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DESTINATIONS, value);
}

function validVisit(value: unknown, config: BridgeConfig, now: number): value is Visit {
  if (!isObject(value)) return false;
  return (
    value["version"] === 1 &&
    typeof value["nonce"] === "string" &&
    NONCE.test(value["nonce"]) &&
    !!factoryOrigin(config, value["factoryId"]) &&
    destinationId(value["destinationId"]) &&
    Number.isSafeInteger(value["issuedAt"]) &&
    Number.isSafeInteger(value["expiresAt"]) &&
    (value["issuedAt"] as number) >= 0 &&
    (value["issuedAt"] as number) <= now &&
    now < (value["expiresAt"] as number) &&
    (value["expiresAt"] as number) > (value["issuedAt"] as number) &&
    (value["expiresAt"] as number) - (value["issuedAt"] as number) <= lifetime(config)
  );
}

function validSession(session: FactorySession | null, now: number): session is FactorySession {
  return (
    !!session &&
    typeof session.id === "string" &&
    /^[a-zA-Z0-9-]{8,64}$/.test(session.id) &&
    Number.isSafeInteger(session.createdAt) &&
    session.createdAt <= now &&
    now - session.createdAt < MAX_SESSION_MS &&
    validSnapshot(session.snapshot)
  );
}

function validOriginVisit(value: unknown, config: BridgeConfig, now: number): value is OriginVisit {
  if (!isObject(value)) return false;
  const sessionId = value["factorySessionId"];
  const snapshot = value["snapshot"];
  return validVisit(value, config, now) && typeof sessionId === "string" && validSnapshot(snapshot);
}

function readRecords<T>(
  storage: StorageLike | null,
  key: string,
  validate: (record: unknown) => record is T,
): T[] {
  try {
    const raw = storage?.getItem(key);
    if (!raw || raw.length > MAX_STORAGE_LENGTH) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_RECORDS) return [];
    return parsed.filter(validate);
  } catch {
    return [];
  }
}

function saveRecords<T extends { nonce: string }>(
  storage: StorageLike | null,
  key: string,
  records: T[],
  record: T,
): boolean {
  try {
    if (!storage) return false;
    const next = [...records.filter((item) => item.nonce !== record.nonce), record].slice(
      -MAX_RECORDS,
    );
    const raw = JSON.stringify(next);
    if (raw.length > MAX_STORAGE_LENGTH) return false;
    storage.setItem(key, raw);
    return storage.getItem(key) === raw;
  } catch {
    return false;
  }
}

export function safeSessionStorage(window: Pick<Window, "sessionStorage">): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function appendMarker(href: string, name: string, value: string) {
  const url = new URL(href);
  const original = url.hash.slice(1);
  url.hash = `${original ? `${original}&` : ""}${name}=${value}`;
  return url.href;
}

/** Removes only reserved fragment fields, leaving the query and other hash bytes alone. */
export function stripFactoryMarkers(href: string) {
  const url = new URL(href);
  const kept: string[] = [];
  const markers: { name: string; value: string | null }[] = [];
  for (const part of url.hash.slice(1).split("&")) {
    const equals = part.indexOf("=");
    const name = equals < 0 ? part : part.slice(0, equals);
    if (name === ENTRY || name === RETURN)
      markers.push({ name, value: equals < 0 ? null : part.slice(equals + 1) });
    else kept.push(part);
  }
  if (markers.length) url.hash = kept.join("&");
  return { cleanHref: url.href, markers };
}

function scrub(href: string, history: HistoryLike) {
  const result = stripFactoryMarkers(href);
  if (result.markers.length) history.replaceState(history.state, "", result.cleanHref);
  return result;
}

function parseEntry(raw: string | null, config: BridgeConfig, now: number): Visit | null {
  if (!raw || raw.length > 256) return null;
  const fields = raw.split(".");
  if (
    fields.length !== 6 ||
    fields[0] !== "v1" ||
    !TIMESTAMP.test(fields[4] ?? "") ||
    !TIMESTAMP.test(fields[5] ?? "")
  )
    return null;
  const visit = {
    version: 1,
    factoryId: fields[1],
    destinationId: fields[2],
    nonce: fields[3],
    issuedAt: Number(fields[4]),
    expiresAt: Number(fields[5]),
  };
  return validVisit(visit, config, now) ? visit : null;
}

function marker(visit: Visit): HistoryMarker {
  return {
    version: 1,
    nonce: visit.nonce,
    factoryId: visit.factoryId,
    destinationId: visit.destinationId,
  };
}

function mergeMarker(state: unknown, visit: Visit) {
  // Refuse unsupported primitive state instead of clobbering another application's state.
  if (state != null && !isObject(state)) return null;
  return { ...(state ?? {}), [DESTINATION_HISTORY_KEY]: marker(visit) };
}

export function createFactoryDeparture({
  session,
  destinationId: destination,
  factoryId,
  origin,
  storage,
  config = DEFAULT_CONFIG,
  now = Date.now(),
  destinationHash = "",
}: {
  session: FactorySession | null;
  destinationId: DestinationId;
  factoryId: string;
  origin: string;
  storage: StorageLike | null;
  config?: BridgeConfig;
  now?: number;
  destinationHash?: string;
}): string | null {
  if (
    !validSession(session, now) ||
    !destinationId(destination) ||
    factoryOrigin(config, factoryId) !== origin ||
    !lifetime(config) ||
    !session.snapshot.unlocked ||
    session.snapshot.active !== Object.keys(DESTINATIONS).indexOf(destination) + 1
  )
    return null;
  try {
    const base = new URL("/", DESTINATIONS[destination]);
    base.hash = destinationHash;
    if (stripFactoryMarkers(base.href).markers.length || destinationHash.length > 512) return null;
    const visit: OriginVisit = {
      version: 1,
      factoryId,
      destinationId: destination,
      nonce: randomNonce(),
      issuedAt: now,
      expiresAt: Math.min(now + lifetime(config), session.createdAt + MAX_SESSION_MS),
      factorySessionId: session.id,
      snapshot: { ...session.snapshot },
    };
    const records = readRecords(storage, ORIGIN_STORAGE_KEY, (value): value is OriginVisit =>
      validOriginVisit(value, config, now),
    );
    if (!saveRecords(storage, ORIGIN_STORAGE_KEY, records, visit)) return null;
    const encoded = `v1.${factoryId}.${destination}.${visit.nonce}.${visit.issuedAt}.${visit.expiresAt}`;
    return appendMarker(base.href, ENTRY, encoded);
  } catch {
    return null;
  }
}

/** Call before ordinary root boot creates/replaces a factory session. Always strips its marker. */
export function restoreFactoryReturn({
  session,
  href,
  history,
  storage,
  config = DEFAULT_CONFIG,
  now = Date.now(),
}: {
  session: FactorySession | null;
  href: string;
  history: HistoryLike;
  storage: StorageLike | null;
  config?: BridgeConfig;
  now?: number;
}): Snapshot | null {
  try {
    const parsed = scrub(href, history);
    const first = parsed.markers[0];
    if (
      !first ||
      parsed.markers.length !== 1 ||
      first.name !== RETURN ||
      !validSession(session, now)
    )
      return null;
    const match = /^v1\.([A-Za-z0-9_-]{22})$/.exec(first.value ?? "");
    if (!match) return null;
    const url = new URL(parsed.cleanHref);
    if (url.pathname !== "/" || url.username || url.password) return null;
    const records = readRecords(storage, ORIGIN_STORAGE_KEY, (value): value is OriginVisit =>
      validOriginVisit(value, config, now),
    );
    const record = records.find(
      (item) =>
        item.nonce === match[1] &&
        item.factorySessionId === session.id &&
        factoryOrigin(config, item.factoryId) === url.origin,
    );
    if (!record) return null;
    // Retain the record within its TTL so Back to this destination can return again.
    return { ...record.snapshot, unlocked: record.snapshot.unlocked || session.snapshot.unlocked };
  } catch {
    return null;
  }
}

/** New enrollment requires the trusted referrer. Reload/BFCache use the bound history record. */
export function enrollDestination({
  href,
  referrer,
  history,
  storage,
  topLevel = true,
  config = DEFAULT_CONFIG,
  now = Date.now(),
}: {
  href: string;
  referrer: string;
  history: HistoryLike;
  storage: StorageLike | null;
  topLevel?: boolean;
  config?: BridgeConfig;
  now?: number;
}): Visit | null {
  try {
    const parsed = scrub(href, history);
    if (!parsed.markers.length) return null;
    // A malformed new marker must not reactivate an earlier marked history entry.
    if (isObject(history.state) && DESTINATION_HISTORY_KEY in history.state) {
      const cleanState = { ...history.state };
      delete cleanState[DESTINATION_HISTORY_KEY];
      history.replaceState(cleanState, "", parsed.cleanHref);
    }
    const first = parsed.markers[0];
    if (!topLevel || !first || parsed.markers.length !== 1 || first.name !== ENTRY) return null;
    const visit = parseEntry(first.value, config, now);
    const url = new URL(parsed.cleanHref);
    if (
      !visit ||
      url.origin !== DESTINATIONS[visit.destinationId] ||
      url.pathname !== "/" ||
      url.username ||
      url.password
    )
      return null;
    const from = new URL(referrer);
    if (from.origin !== factoryOrigin(config, visit.factoryId) || from.username || from.password)
      return null;
    const next = mergeMarker(history.state, visit);
    if (!next) return null;
    const records = readRecords(storage, DESTINATION_STORAGE_KEY, (value): value is Visit =>
      validVisit(value, config, now),
    );
    if (!saveRecords(storage, DESTINATION_STORAGE_KEY, records, visit)) return null;
    history.replaceState(next, "", parsed.cleanHref);
    return visit;
  } catch {
    return null;
  }
}

export function getDestinationVisit({
  href,
  state,
  storage,
  topLevel = true,
  isRouteAllowed = (pathname: string) => pathname === "/",
  config = DEFAULT_CONFIG,
  now = Date.now(),
}: {
  href: string;
  state: unknown;
  storage: StorageLike | null;
  topLevel?: boolean;
  isRouteAllowed?: (pathname: string, destination: DestinationId) => boolean;
  config?: BridgeConfig;
  now?: number;
}): Visit | null {
  try {
    if (!topLevel || !isObject(state)) return null;
    const saved = state[DESTINATION_HISTORY_KEY];
    if (!isObject(saved) || saved["version"] !== 1) return null;
    const url = new URL(href);
    if (stripFactoryMarkers(href).markers.length || url.username || url.password) return null;
    const records = readRecords(storage, DESTINATION_STORAGE_KEY, (value): value is Visit =>
      validVisit(value, config, now),
    );
    return (
      records.find(
        (item) =>
          item.nonce === saved["nonce"] &&
          item.factoryId === saved["factoryId"] &&
          item.destinationId === saved["destinationId"] &&
          url.origin === DESTINATIONS[item.destinationId] &&
          isRouteAllowed(url.pathname, item.destinationId),
      ) ?? null
    );
  } catch {
    return null;
  }
}

/** Call before a same-origin router PUSH/REPLACE, using its previous current state. */
export function inheritDestinationRoute({
  visit,
  nextHref,
  nextState,
  action = "PUSH",
  isRouteAllowed = (pathname: string) => pathname === "/",
  config = DEFAULT_CONFIG,
  now = Date.now(),
}: {
  visit: Visit | null;
  nextHref: string;
  nextState: unknown;
  action?: string;
  isRouteAllowed?: (pathname: string, destination: DestinationId) => boolean;
  config?: BridgeConfig;
  now?: number;
}): unknown {
  try {
    if (!visit || !validVisit(visit, config, now) || (action !== "PUSH" && action !== "REPLACE"))
      return nextState;
    const url = new URL(nextHref, DESTINATIONS[visit.destinationId]);
    if (
      url.origin !== DESTINATIONS[visit.destinationId] ||
      url.username ||
      url.password ||
      stripFactoryMarkers(url.href).markers.length ||
      !isRouteAllowed(url.pathname, visit.destinationId)
    )
      return nextState;
    return mergeMarker(nextState, visit) ?? nextState;
  } catch {
    return nextState;
  }
}

export function destinationReturnUrl(visit: Visit, config = DEFAULT_CONFIG, now = Date.now()) {
  if (!validVisit(visit, config, now)) return null;
  const origin = factoryOrigin(config, visit.factoryId);
  return origin ? appendMarker(`${origin}/`, RETURN, `v1.${visit.nonce}`) : null;
}
