import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  DEFAULT_LIFETIME_MS,
  MAX_RECORDS,
  DESTINATIONS,
  DESTINATION_HISTORY_KEY,
  ORIGIN_STORAGE_KEY,
  DESTINATION_STORAGE_KEY,
  createFactoryDeparture,
  restoreFactoryReturn,
  enrollDestination,
  getDestinationVisit,
  inheritDestinationRoute,
  destinationReturnUrl,
  stripFactoryMarkers,
} from "../../src/lib/factory-travel/protocol.ts";

const now = 1_000_000_000;
const session = (active = 1) => ({
  id: "factory-test-session",
  createdAt: now,
  snapshot: { unlocked: true, active, expanded: true },
});
const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    values,
  };
};
const history = (href, state = null) => ({
  href,
  state,
  calls: [],
  replaceState(next, unused, url) {
    this.state = next;
    this.href = String(url);
    this.calls.push({ next, url });
  },
});
function depart(active = 1, extra = {}) {
  const originStore = storage();
  const current = session(active);
  const id = Object.keys(DESTINATIONS)[active - 1];
  const href = createFactoryDeparture({
    session: current,
    destinationId: id,
    factoryId: "production",
    origin: "https://psstmatt.com",
    storage: originStore,
    now,
    ...extra,
  });
  assert.ok(href);
  return { originStore, current, href, id };
}
function enroll(departure, extra = {}) {
  const destinationStore = storage();
  const hist = history(departure.href, { __TSR_key: "preserved", other: "state" });
  const visit = enrollDestination({
    href: departure.href,
    referrer: "https://psstmatt.com/",
    history: hist,
    storage: destinationStore,
    now,
    ...extra,
  });
  return { destinationStore, hist, visit };
}
function get(e, extra = {}) {
  return getDestinationVisit({
    href: e.hist.href,
    state: e.hist.state,
    storage: e.destinationStore,
    now,
    ...extra,
  });
}
function restore(d, visit, extra = {}) {
  const href = destinationReturnUrl(visit, DEFAULT_CONFIG, now);
  const hist = history(href, { __TSR_key: "origin-key" });
  const snapshot = restoreFactoryReturn({
    href,
    history: hist,
    storage: d.originStore,
    session: d.current,
    now,
    ...extra,
  });
  return { snapshot, hist };
}

test("all three destinations return to the exact locally earned snapshot, preserving router state", () => {
  for (let active = 1; active <= 3; active++) {
    const d = depart(active);
    const e = enroll(d);
    assert.ok(e.visit);
    assert.equal(new URL(e.hist.href).hash, "");
    assert.equal(e.hist.state.__TSR_key, "preserved");
    assert.equal(e.hist.state.other, "state");
    assert.equal(get(e)?.nonce, e.visit.nonce);
    const result = restore(d, e.visit);
    assert.deepEqual(result.snapshot, d.current.snapshot);
    assert.equal(result.hist.href, "https://psstmatt.com/");
    assert.deepEqual(result.hist.state, { __TSR_key: "origin-key" });
    assert.deepEqual(restore(d, e.visit).snapshot, d.current.snapshot, "same visit is idempotent");
    assert.ok(d.originStore.getItem(ORIGIN_STORAGE_KEY), "do not consume on first return");
  }
});

test("fragment stripping preserves underlying query and anchor byte spelling", () => {
  const d = depart(1, { destinationHash: "#section%20one&mode=tiles" });
  const withQuery = d.href.replace("/#", "/?sort=recent&x=1#");
  const e = enroll({ ...d, href: withQuery });
  assert.ok(e.visit);
  assert.equal(e.hist.href, "https://scout.psstmatt.com/?sort=recent&x=1#section%20one&mode=tiles");
  assert.equal(
    stripFactoryMarkers("https://scout.psstmatt.com/#ordinary").cleanHref,
    "https://scout.psstmatt.com/#ordinary",
  );
});

test("direct visits do not arm despite an older accepted record", () => {
  const e = enroll(depart());
  assert.ok(get(e));
  assert.equal(get(e, { state: null }), null);
  assert.equal(get(e, { state: {} }), null);
  assert.equal(get(e, { topLevel: false }), null);
  assert.equal(get(e, { href: "https://other.example/" }), null);
  assert.equal(get(e, { href: "https://scout.psstmatt.com/direct" }), null);
  const direct = history("https://scout.psstmatt.com/");
  assert.equal(
    enrollDestination({
      href: direct.href,
      referrer: "https://psstmatt.com/",
      history: direct,
      storage: e.destinationStore,
      now,
    }),
    null,
  );
  assert.equal(direct.state, null);
});

test("new enrollment requires exact source referrer and the expected destination root", () => {
  const d = depart();
  for (const referrer of [
    "",
    "https://evil.example/",
    "https://psstmatt.com.evil.example/",
    "http://psstmatt.com/",
    "https://psstmatt.com:8443/",
    "https://u:p@psstmatt.com/",
  ])
    assert.equal(enroll(d, { referrer }).visit, null, referrer);
  for (const badHref of [
    d.href.replace(".com/", ".com.evil.example/"),
    d.href.replace(".com/", ".com:8443/"),
    d.href.replace(".com/", ".com/deep"),
    d.href.replace("scout.", "references."),
    d.href.replace("https:", "http:"),
  ])
    assert.equal(enroll({ ...d, href: badHref }).visit, null, badHref);
  assert.equal(enroll(d, { topLevel: false }).visit, null);
});

test("a preview is accepted only by its exact explicit configured origin", () => {
  const config = {
    factories: {
      ...DEFAULT_CONFIG.factories,
      preview: "https://factory-example.psstmatt.chatgpt.site",
    },
  };
  const d = depart(1, { config, factoryId: "preview", origin: config.factories.preview });
  assert.equal(enroll(d, { referrer: config.factories.preview + "/" }).visit, null);
  const e = enroll(d, { config, referrer: config.factories.preview + "/" });
  assert.ok(e.visit);
  assert.equal(
    destinationReturnUrl(e.visit, config, now).split("#")[0],
    config.factories.preview + "/",
  );
  assert.equal(enroll(d, { config, referrer: "https://other.psstmatt.chatgpt.site/" }).visit, null);
});

test("malformed, duplicated, oversized, future and expired entry markers fail closed and are stripped", () => {
  const d = depart();
  const value = new URL(d.href).hash.split("=")[1];
  const corrupt = [
    "",
    "v2." + value.slice(3),
    value.replace(".production.", ".unknown."),
    value.replace(".scout.", ".unknown."),
    value.replace(/\.[A-Za-z0-9_-]{22}\./, ".short."),
    value + ".extra",
    "x".repeat(257),
    value.replace(`.${now}.`, `.${now + 1}.`),
    value.replace(String(now + DEFAULT_LIFETIME_MS), String(now - 1)),
    value.replace(String(now + DEFAULT_LIFETIME_MS), String(now + DEFAULT_LIFETIME_MS + 1)),
    value.replace(String(now + DEFAULT_LIFETIME_MS), "Infinity"),
    value.replace(String(now), "0" + now),
    "%ZZ",
  ];
  for (const bad of corrupt) {
    const href = `https://scout.psstmatt.com/#part&__factory_entry=${bad}`;
    const e = enroll({ ...d, href });
    assert.equal(e.visit, null, bad);
    assert.equal(e.hist.href, "https://scout.psstmatt.com/#part");
  }
  for (const suffix of ["&__factory_entry=" + value, "&__factory_return=v1.x"]) {
    const e = enroll({ ...d, href: d.href + suffix });
    assert.equal(e.visit, null);
    assert.equal(e.hist.href, "https://scout.psstmatt.com/");
  }
  const e = enroll(d);
  const malformed = e.hist.href + "#__factory_entry=broken";
  enrollDestination({
    href: malformed,
    referrer: "https://psstmatt.com/",
    history: e.hist,
    storage: e.destinationStore,
    now,
  });
  assert.equal(get(e), null, "new invalid marker clears old entry binding");
});

test("expiry is checked on entry, use, return, reload and BFCache, without sliding", () => {
  const d = depart();
  const e = enroll(d);
  const expired = now + DEFAULT_LIFETIME_MS;
  assert.equal(enroll(d, { now: expired }).visit, null);
  assert.equal(get(e, { now: expired }), null);
  assert.equal(destinationReturnUrl(e.visit, DEFAULT_CONFIG, expired), null);
  assert.equal(restore(d, e.visit, { now: expired }).snapshot, null);
  assert.equal(get(e, { now: now - 1 }), null);
  assert.equal(get(e, { now: expired - 1 })?.expiresAt, expired);
});

test("return rejects absent, other-tab, wrong-session, bad nonce and corrupt local snapshots", () => {
  const d = depart();
  const e = enroll(d);
  assert.equal(restore(d, e.visit, { storage: storage() }).snapshot, null);
  assert.equal(restore(d, e.visit, { storage: null }).snapshot, null);
  assert.equal(restore(d, e.visit, { session: null }).snapshot, null);
  assert.equal(
    restore(d, e.visit, { session: { ...d.current, id: "different-session" } }).snapshot,
    null,
  );
  assert.equal(restore(d, { ...e.visit, nonce: "a".repeat(22) }).snapshot, null);
  const records = JSON.parse(d.originStore.getItem(ORIGIN_STORAGE_KEY));
  records[0].snapshot = { unlocked: false, active: 3, expanded: true };
  d.originStore.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(records));
  assert.equal(restore(d, e.visit).snapshot, null);
});

test("no query or arbitrary fragment grants an unlock or active computer", () => {
  const d = depart();
  const e = enroll(d);
  for (const href of [
    "https://psstmatt.com/?unlocked=1&machine=3",
    "https://psstmatt.com/#unlocked=1",
    "https://psstmatt.com/#__factory_return=v1." + "z".repeat(22),
  ])
    assert.equal(
      restoreFactoryReturn({
        session: d.current,
        href,
        history: history(href),
        storage: d.originStore,
        now,
      }),
      null,
    );
  const href = destinationReturnUrl(e.visit, DEFAULT_CONFIG, now).replace(
    "/#",
    "/?unlocked=0&machine=3#",
  );
  assert.deepEqual(
    restoreFactoryReturn({
      session: d.current,
      href,
      history: history(href),
      storage: d.originStore,
      now,
    }),
    d.current.snapshot,
  );
});

test("return rejects foreign factory origins and non-root paths", () => {
  const d = depart();
  const e = enroll(d);
  const original = destinationReturnUrl(e.visit, DEFAULT_CONFIG, now);
  for (const href of [
    original.replace("psstmatt.com", "evil.example"),
    original.replace("/#", "/about#"),
    original.replace("https:", "http:"),
  ])
    assert.equal(
      restoreFactoryReturn({
        session: d.current,
        href,
        history: history(href),
        storage: d.originStore,
        now,
      }),
      null,
    );
});

test("bounded map retains older destination snapshots across later visits, then evicts oldest", () => {
  const shared = storage();
  const entries = [];
  for (let i = 0; i < MAX_RECORDS + 1; i++) {
    const active = (i % 3) + 1;
    const d = depart(active, { storage: shared });
    d.originStore = shared;
    entries.push({ d, e: enroll(d) });
  }
  assert.equal(JSON.parse(shared.getItem(ORIGIN_STORAGE_KEY)).length, MAX_RECORDS);
  assert.equal(restore(entries[0].d, entries[0].e.visit).snapshot, null);
  for (const { d, e } of entries.slice(1))
    assert.deepEqual(restore(d, e.visit).snapshot, d.current.snapshot);
});

test("only explicit forward same-origin allowed routes inherit; reload and history restore existing markers", () => {
  const e = enroll(depart());
  const isRouteAllowed = (path) => path === "/" || path.startsWith("/work/");
  const next = inheritDestinationRoute({
    visit: e.visit,
    nextHref: "/work/a",
    nextState: { __TSR_key: "next", preserved: true },
    isRouteAllowed,
    now,
  });
  assert.equal(next.__TSR_key, "next");
  assert.equal(next.preserved, true);
  assert.equal(
    get(e, { href: "https://scout.psstmatt.com/work/a", state: next, isRouteAllowed })?.nonce,
    e.visit.nonce,
  );
  assert.equal(
    get(e, { href: "https://scout.psstmatt.com/work/a", state: {}, isRouteAllowed }),
    null,
  );
  for (const extra of [
    { action: "BACK" },
    { action: "FORWARD" },
    { action: "GO" },
    { nextHref: "https://evil.example/" },
    { nextHref: "/admin" },
    { visit: null },
  ]) {
    const empty = { key: "untouched" };
    assert.equal(
      inheritDestinationRoute({
        visit: e.visit,
        nextHref: "/work/a",
        nextState: empty,
        isRouteAllowed,
        now,
        ...extra,
      }),
      empty,
    );
  }
  assert.ok(get(e)); // Restoring the old history entry reuses its own accepted context.
});

test("blocked storage, failed write/readback and primitive history state fail closed", () => {
  const denied = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("denied");
    },
  };
  const silent = {
    getItem() {
      return null;
    },
    setItem() {},
  };
  for (const badStorage of [null, denied, silent]) {
    assert.equal(
      createFactoryDeparture({
        session: session(),
        destinationId: "scout",
        factoryId: "production",
        origin: "https://psstmatt.com",
        storage: badStorage,
        now,
      }),
      null,
    );
    assert.equal(enroll(depart(), { storage: badStorage }).visit, null);
  }
  const d = depart();
  const hist = history(d.href, "primitive");
  assert.equal(
    enrollDestination({
      href: d.href,
      referrer: "https://psstmatt.com/",
      history: hist,
      storage: storage(),
      now,
    }),
    null,
  );
  assert.equal(hist.state, "primitive");
});

test("issuer validates unlock, selected destination and lifetime before minting", () => {
  const input = {
    session: session(),
    destinationId: "scout",
    factoryId: "production",
    origin: "https://psstmatt.com",
    storage: storage(),
    now,
  };
  for (const extra of [
    { session: { ...session(), snapshot: { unlocked: false, active: 0, expanded: false } } },
    { session: session(2) },
    { destinationId: "other" },
    { origin: "https://evil.example" },
    { config: { ...DEFAULT_CONFIG, lifetimeMs: DEFAULT_LIFETIME_MS + 1 } },
    { destinationHash: "#__factory_return=x" },
  ])
    assert.equal(createFactoryDeparture({ ...input, ...extra }), null);
});

test("storage is minimal and URLs contain only public navigation fields", () => {
  const d = depart();
  const e = enroll(d);
  assert.ok(!d.href.includes(d.current.id));
  assert.ok(!d.href.includes("unlocked"));
  const records = JSON.parse(e.destinationStore.getItem(DESTINATION_STORAGE_KEY));
  assert.deepEqual(
    Object.keys(records[0]).sort(),
    ["version", "nonce", "factoryId", "destinationId", "issuedAt", "expiresAt"].sort(),
  );
  assert.deepEqual(
    Object.keys(e.hist.state[DESTINATION_HISTORY_KEY]).sort(),
    ["version", "nonce", "factoryId", "destinationId"].sort(),
  );
});
