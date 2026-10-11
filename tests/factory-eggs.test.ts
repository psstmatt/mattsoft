import { describe, expect, it } from "bun:test";
import {
  createFactoryEggController,
  factoryTouchMayStart,
  factoryEggTouchTap,
  openFactoryForReview,
  eggAvailable,
  eggMatchesMachine,
  FACTORY_EGG_DURATION,
  FACTORY_EGG_IDLE_MS,
  factoryEggMode,
  type EggEnvironment,
  type EggKey,
  type FactoryEgg,
} from "../src/lib/factory-eggs";

import {
  advanceKonami,
  createKonamiState,
  KONAMI_KEYBOARD_SEQUENCE,
  swipeSymbol,
} from "../src/lib/konami-input";

function fixture(
  overrides: Partial<EggEnvironment> = {},
  canShow: (egg: FactoryEgg) => boolean = () => true,
) {
  let time = 0;
  let nextTimer = 0;
  let clears = 0;
  const pending = new Map<number, { at: number; callback: () => void }>();
  const state: EggEnvironment = {
    expanded: true,
    settled: true,
    visible: true,
    blocked: false,
    pointerDown: false,
    reducedMotion: false,
    machine: "anduril",
    ...overrides,
  };
  const shown: { egg: FactoryEgg; reduced: boolean; at: number }[] = [];
  const sounds: ("sonar" | "valve")[] = [];
  const controller = createFactoryEggController({
    environment: () => state,
    canShow,
    now: () => time,
    show: (egg, reduced) => shown.push({ egg, reduced, at: time }),
    clear: () => clears++,
    sound: (egg) => sounds.push(egg),
    schedule: (callback, delay) => {
      const id = ++nextTimer;
      pending.set(id, { callback, at: time + delay });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    unschedule: (id) => {
      pending.delete(id as unknown as number);
    },
  });
  function advance(ms: number) {
    const end = time + ms;
    let executions = 0;
    while (true) {
      const next = [...pending.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      if (++executions > 1000) throw new Error("Runaway fake timer loop");
      time = next[1].at;
      pending.delete(next[0]);
      next[1].callback();
    }
    time = end;
  }
  return {
    state,
    controller,
    shown,
    sounds,
    advance,
    clears: () => clears,
    timerCount: () => pending.size,
  };
}

function key(value: string, overrides: Partial<EggKey> = {}): EggKey {
  return {
    key: value,
    repeat: false,
    isComposing: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    defaultPrevented: false,
    ...overrides,
  };
}

function type(f: ReturnType<typeof fixture>, text: string, overrides: Partial<EggKey> = {}) {
  return [...text].map((value) => f.controller.key(key(value, overrides)));
}

const machines: Record<FactoryEgg, string> = {
  sonar: "anduril",
  valve: "scout",
  sticker: "references",
  lan: "anduril",
  hotdog: "anduril",
};
const eggs = Object.keys(machines) as FactoryEgg[];

const unavailableStates: [string, Partial<EggEnvironment>][] = [
  ["collapsed", { expanded: false }],
  ["unsettled", { settled: false }],
  ["hidden", { visible: false }],
  ["blocked by an input or modal", { blocked: true }],
];
const idleGuards: [string, Partial<EggEnvironment>][] = [
  ...unavailableStates,
  ["pointer held down", { pointerDown: true }],
  ["reduced motion", { reducedMotion: true }],
];

describe("factory egg opt-in policy", () => {
  it("is off by default and only accepts the two exact opt-in values", () => {
    for (const search of [
      "",
      "?other=1",
      "?eggs=",
      "?eggs=0",
      "?eggs=true",
      "?eggs=REVIEW",
      "?eggs=01",
    ])
      expect(factoryEggMode(search)).toBe("off");
    expect(factoryEggMode("?eggs=1")).toBe("secret");
    expect(factoryEggMode("?other=1&eggs=review")).toBe("review");
    expect(factoryEggMode("?eggs=review", "matt-konami-computers.psstmatt.chatgpt.site")).toBe(
      "review",
    );
  });

  it("uses secret discovery on production and cannot reveal a review workbench via query", () => {
    for (const hostname of [
      "psstmatt.com",
      "www.psstmatt.com",
      "preview.psstmatt.com",
      "deep.preview.psstmatt.com",
    ])
      for (const search of [
        "",
        "?eggs=1",
        "?eggs=review",
        "?eggs=0",
        "?deck=1&replay=1&eggs=review",
      ]) {
        const mode = factoryEggMode(search, hostname);
        expect(mode).toBe("secret");
        let opened = false;
        expect(
          openFactoryForReview(mode, () => {
            opened = true;
          }),
        ).toBe(false);
        expect(opened).toBe(false);
      }
    expect(factoryEggMode("?eggs=1", "notpsstmatt.com")).toBe("secret");
    expect(factoryEggMode("?eggs=1", "psstmatt.com.example.org")).toBe("secret");
  });

  it("restricts each local egg to its intended machine", () => {
    for (const egg of eggs) {
      for (const machine of ["anduril", "scout", "references", "unknown"]) {
        const matches = egg === "lan" || egg === "hotdog" || machines[egg] === machine;
        expect(eggMatchesMachine(egg, machine)).toBe(matches);
        const f = fixture({ machine });
        expect(f.controller.activate(egg)).toBe(matches);
        expect(f.controller.active).toBe(matches ? egg : null);
        expect(f.shown).toHaveLength(matches ? 1 : 0);
        f.controller.dispose();
      }
    }
  });

  for (const [name, overrides] of unavailableStates) {
    it(`blocks every activation while ${name}`, () => {
      const f = fixture(overrides);
      expect(eggAvailable(f.state)).toBe(false);
      for (const egg of eggs) {
        f.state.machine = machines[egg];
        expect(f.controller.activate(egg, true)).toBe(false);
      }
      expect(f.shown).toEqual([]);
      expect(f.sounds).toEqual([]);
      expect(f.timerCount()).toBe(0);
    });
  }
});

describe("factory egg display and cancellation", () => {
  for (const egg of eggs) {
    it(`clears ${egg} at its exact display duration`, () => {
      const f = fixture({ machine: machines[egg] });
      expect(f.controller.activate(egg)).toBe(true);
      f.advance(FACTORY_EGG_DURATION[egg] - 1);
      expect(f.controller.active).toBe(egg);
      const clears = f.clears();
      f.advance(1);
      expect(f.controller.active).toBeNull();
      expect(f.clears()).toBe(clears + 1);
      expect(f.shown).toHaveLength(1);
    });
  }

  it("replaces the previous egg and cancels its old expiration", () => {
    const f = fixture();
    f.controller.activate("sonar");
    f.advance(500);
    f.controller.activate("hotdog");
    expect(f.controller.active).toBe("hotdog");
    expect(f.shown.map(({ egg }) => egg)).toEqual(["sonar", "hotdog"]);
    expect(f.timerCount()).toBe(2); // One expiration and one idle deadline.
    const clears = f.clears();
    f.advance(FACTORY_EGG_DURATION.sonar - 500);
    expect(f.controller.active).toBe("hotdog");
    expect(f.clears()).toBe(clears);
    f.advance(FACTORY_EGG_DURATION.hotdog - FACTORY_EGG_DURATION.sonar + 500);
    expect(f.controller.active).toBeNull();
    expect(f.clears()).toBe(clears + 1);
  });

  it("does not disturb a visible egg when a different-machine activation is rejected", () => {
    const f = fixture();
    f.controller.activate("sonar");
    const clears = f.clears();
    expect(f.controller.activate("valve", true)).toBe(false);
    expect(f.controller.active).toBe("sonar");
    expect(f.clears()).toBe(clears);
    expect(f.sounds).toEqual([]);
  });

  it("clears synchronously on Escape without consuming the navigation event", () => {
    const f = fixture();
    f.controller.activate("hotdog");
    type(f, "HOT");
    let prevented = 0;
    let stopped = 0;
    const event = {
      ...key("Escape", { defaultPrevented: true, isComposing: true }),
      preventDefault: () => prevented++,
      stopPropagation: () => stopped++,
      stopImmediatePropagation: () => stopped++,
    };
    const clears = f.clears();
    expect(f.controller.key(event)).toBe(false);
    expect(f.controller.active).toBeNull();
    expect(f.clears()).toBe(clears + 1);
    expect(prevented).toBe(0);
    expect(stopped).toBe(0);
    expect(type(f, "DOG")).not.toContain(true);
  });

  it("only requests audio for a successful gestured sonar or valve", () => {
    for (const egg of eggs) {
      const f = fixture({ machine: machines[egg] });
      f.controller.activate(egg);
      expect(f.sounds).toEqual([]);
      f.controller.activate(egg, true);
      expect(f.sounds).toEqual(egg === "sonar" || egg === "valve" ? [egg] : []);
    }
  });

  it("provides the reduced-motion representation and shorter sonar lifetime", () => {
    const f = fixture({ reducedMotion: true });
    f.controller.activate("sonar");
    expect(f.shown).toEqual([{ egg: "sonar", reduced: true, at: 0 }]);
    f.advance(1999);
    expect(f.controller.active).toBe("sonar");
    f.advance(1);
    expect(f.controller.active).toBeNull();
    expect(f.timerCount()).toBe(0);
  });
});

describe("factory LAN inactivity policy", () => {
  it("waits a full 45 seconds and plays only once in the same visit", () => {
    const f = fixture();
    expect(FACTORY_EGG_IDLE_MS).toBe(45_000);
    f.advance(44_999);
    expect(f.shown).toEqual([]);
    f.advance(1);
    expect(f.shown).toEqual([{ egg: "lan", reduced: false, at: 45_000 }]);
    expect(f.sounds).toEqual([]);
    f.advance(200_000);
    f.controller.activity();
    f.advance(100_000);
    expect(f.shown).toHaveLength(1);
    expect(f.timerCount()).toBe(0);
  });

  it("restarts the full idle deadline on each activity", () => {
    const f = fixture();
    f.advance(44_999);
    f.controller.activity();
    f.advance(44_999);
    expect(f.shown).toEqual([]);
    f.controller.key(key("ArrowLeft"));
    f.advance(44_999);
    expect(f.shown).toEqual([]);
    f.advance(1);
    expect(f.shown).toEqual([{ egg: "lan", reduced: false, at: 134_998 }]);
  });

  it("rejects an automatic LAN request before the inactivity deadline", () => {
    const f = fixture();
    f.advance(44_999);
    expect(f.controller.activate("lan", false, true)).toBe(false);
    expect(f.controller.activate("sonar", false, true)).toBe(false);
    expect(f.shown).toEqual([]);
  });

  for (const [name, overrides] of idleGuards) {
    it(`does not arm idle while ${name}`, () => {
      const f = fixture(overrides);
      expect(f.timerCount()).toBe(0);
      f.advance(100_000);
      expect(f.shown).toEqual([]);
    });

    it(`rechecks ${name} at the scheduled idle deadline`, () => {
      const f = fixture();
      f.advance(44_999);
      Object.assign(f.state, overrides);
      f.advance(1);
      expect(f.shown).toEqual([]);
      expect(f.controller.active).toBeNull();
      expect(f.timerCount()).toBe(0);
    });
  }

  it("allows an explicit review LAN as a static reduced-motion display", () => {
    const f = fixture({ reducedMotion: true });
    expect(f.controller.activate("lan", true)).toBe(true);
    expect(f.shown).toEqual([{ egg: "lan", reduced: true, at: 0 }]);
    expect(f.sounds).toEqual([]);
    f.advance(FACTORY_EGG_DURATION.lan);
    expect(f.controller.active).toBeNull();
    f.advance(FACTORY_EGG_IDLE_MS * 2);
    expect(f.shown).toHaveLength(1);
  });

  it("rejects even an explicit LAN while a pointer is held", () => {
    const f = fixture({ pointerDown: true });
    expect(f.controller.activate("lan", true)).toBe(false);
    expect(f.shown).toEqual([]);
  });

  for (const source of ["activity", "key"] as const) {
    it(`cancels an active LAN immediately on ${source}`, () => {
      const f = fixture();
      f.advance(FACTORY_EGG_IDLE_MS);
      const clears = f.clears();
      if (source === "activity") f.controller.activity();
      else f.controller.key(key("x"));
      expect(f.controller.active).toBeNull();
      expect(f.clears()).toBe(clears + 1);
      expect(f.timerCount()).toBe(0);
      f.advance(FACTORY_EGG_IDLE_MS * 2);
      expect(f.shown).toHaveLength(1);
    });
  }

  it("keeps non-LAN eggs visible during normal activity", () => {
    const f = fixture();
    f.controller.activate("sonar");
    f.controller.activity();
    f.controller.key(key("x"));
    expect(f.controller.active).toBe("sonar");
  });

  it("does not spend the once-per-visit opportunity on a rejected LAN", () => {
    const f = fixture({ pointerDown: true });
    expect(f.controller.activate("lan")).toBe(false);
    f.state.pointerDown = false;
    f.controller.activity();
    f.advance(FACTORY_EGG_IDLE_MS);
    expect(f.controller.active).toBe("lan");
  });
});

describe("HOTDOG keyboard policy", () => {
  it("recognizes case-insensitive complete words without triggering early", () => {
    const f = fixture();
    expect(type(f, "hOtDoG")).toEqual([false, false, false, false, false, true]);
    expect(f.shown.map(({ egg }) => egg)).toEqual(["hotdog"]);
    expect(f.sounds).toEqual([]);
  });

  it("recovers overlapping prefixes while rejecting unrelated characters", () => {
    const f = fixture();
    expect(type(f, "HOTxDOG")).not.toContain(true);
    expect(type(f, "HHOTHOTDOG").filter(Boolean)).toHaveLength(1);
    expect(f.shown).toHaveLength(1);
  });

  const ignored: [string, Partial<EggKey>][] = [
    ["composition", { isComposing: true }],
    ["Control", { ctrlKey: true }],
    ["Alt", { altKey: true }],
    ["Meta", { metaKey: true }],
    ["repeat", { repeat: true }],
    ["already prevented", { defaultPrevented: true }],
  ];
  for (const [name, overrides] of ignored) {
    it(`ignores ${name} keys and clears any partial prefix`, () => {
      const f = fixture();
      expect(type(f, "HOTDOG", overrides)).not.toContain(true);
      type(f, "HOT");
      expect(f.controller.key(key("x", overrides))).toBe(false);
      expect(type(f, "DOG")).not.toContain(true);
      expect(f.shown).toEqual([]);
      expect(type(f, "HOTDOG").at(-1)).toBe(true);
    });
  }

  for (const [name, overrides] of unavailableStates) {
    it(`cannot trigger or retain a prefix while ${name}`, () => {
      const f = fixture();
      type(f, "HOT");
      Object.assign(f.state, overrides);
      expect(type(f, "HOTDOG")).not.toContain(true);
      Object.assign(f.state, { expanded: true, settled: true, visible: true, blocked: false });
      expect(type(f, "DOG")).not.toContain(true);
      expect(f.shown).toEqual([]);
    });
  }

  it("expires a prefix after 1600ms between characters", () => {
    const f = fixture();
    type(f, "HOT");
    f.advance(1601);
    expect(type(f, "DOG")).not.toContain(true);
    expect(f.shown).toEqual([]);
    type(f, "HOT");
    f.advance(1600);
    expect(type(f, "DOG").at(-1)).toBe(true);
  });

  it("uses the gap between keys rather than the total word duration", () => {
    const f = fixture();
    for (const value of "HOTDO") {
      expect(f.controller.key(key(value))).toBe(false);
      f.advance(1500);
    }
    expect(f.controller.key(key("G"))).toBe(true);
  });

  it("resets the prefix on non-character navigation keys", () => {
    const f = fixture();
    type(f, "HOT");
    f.controller.key(key("ArrowLeft"));
    expect(type(f, "DOG")).not.toContain(true);
    expect(f.shown).toEqual([]);
  });

  it("does not consume the successful HOTDOG key event", () => {
    const f = fixture();
    type(f, "HOTDO");
    let consumed = 0;
    const event = {
      ...key("g"),
      preventDefault: () => consumed++,
      stopPropagation: () => consumed++,
    };
    expect(f.controller.key(event)).toBe(true);
    expect(consumed).toBe(0);
  });
});

describe("factory egg lifecycle", () => {
  it("resets the display, partial sequence, and inactivity clock together", () => {
    const f = fixture();
    f.controller.activate("hotdog");
    type(f, "HOT");
    f.advance(1000);
    f.controller.reset();
    expect(f.controller.active).toBeNull();
    expect(f.timerCount()).toBe(1);
    expect(type(f, "DOG")).not.toContain(true);
    f.advance(FACTORY_EGG_IDLE_MS - 1);
    expect(f.shown).toHaveLength(1);
    f.advance(1);
    expect(f.shown.map(({ egg }) => egg)).toEqual(["hotdog", "lan"]);
  });

  it("preserves once-per-visit idle suppression across ordinary resets", () => {
    const f = fixture();
    f.advance(FACTORY_EGG_IDLE_MS);
    f.controller.reset();
    f.advance(FACTORY_EGG_IDLE_MS * 3);
    expect(f.shown).toHaveLength(1);
    expect(f.timerCount()).toBe(0);
    f.controller.reset(true);
    f.advance(FACTORY_EGG_IDLE_MS - 1);
    expect(f.shown).toHaveLength(1);
    f.advance(1);
    expect(f.shown).toHaveLength(2);
  });

  it("starts a fresh 45-second clock after returning from a hidden lifecycle", () => {
    const f = fixture();
    f.advance(30_000);
    f.state.visible = false;
    f.controller.reset();
    expect(f.timerCount()).toBe(0);
    f.advance(120_000);
    f.state.visible = true;
    f.controller.reset();
    f.advance(44_999);
    expect(f.shown).toEqual([]);
    f.advance(1);
    expect(f.shown).toEqual([{ egg: "lan", reduced: false, at: 195_000 }]);
  });

  it("clears all pending timers and the visible egg on dispose", () => {
    const f = fixture();
    f.controller.activate("sonar", true);
    expect(f.timerCount()).toBe(2);
    const clears = f.clears();
    f.controller.dispose();
    expect(f.controller.active).toBeNull();
    expect(f.clears()).toBe(clears + 1);
    expect(f.timerCount()).toBe(0);
    f.advance(FACTORY_EGG_IDLE_MS * 10);
    expect(f.shown).toHaveLength(1);
    expect(f.sounds).toEqual(["sonar"]);
  });

  it("cannot be revived by activation, activity, keys, or reset after disposal", () => {
    const f = fixture();
    f.controller.dispose();
    expect(f.controller.activate("sonar", true)).toBe(false);
    expect(type(f, "HOTDOG")).not.toContain(true);
    f.controller.activity();
    f.controller.reset(true);
    f.controller.dispose();
    f.advance(FACTORY_EGG_IDLE_MS * 10);
    expect(f.timerCount()).toBe(0);
    expect(f.controller.active).toBeNull();
    expect(f.shown).toEqual([]);
    expect(f.sounds).toEqual([]);
  });
});

describe("HOTDOG touch sticker sequence", () => {
  it("shows the sticker on the first four taps and HOTDOG on the fifth", () => {
    const f = fixture({ machine: "references" });
    for (let index = 0; index < 4; index++) {
      expect(f.controller.touchSticker()).toBe(true);
      expect(f.controller.active).toBe("sticker");
      f.advance(400);
    }
    expect(f.controller.touchSticker()).toBe(true);
    expect(f.controller.active).toBe("hotdog");
    expect(f.shown.map(({ egg }) => egg)).toEqual([
      "sticker",
      "sticker",
      "sticker",
      "sticker",
      "hotdog",
    ]);
    expect(f.sounds).toEqual([]);
    expect(f.timerCount()).toBe(2);
    f.advance(FACTORY_EGG_DURATION.hotdog - 1);
    expect(f.controller.active).toBe("hotdog");
    f.advance(1);
    expect(f.controller.active).toBeNull();
  });

  it("accepts a five-tap sequence exactly at the 2200ms boundary", () => {
    const f = fixture({ machine: "references" });
    f.controller.touchSticker();
    for (let index = 0; index < 4; index++) {
      f.advance(550);
      f.controller.touchSticker();
    }
    expect(f.controller.active).toBe("hotdog");
  });

  it("expires taps outside the 2200ms rolling window", () => {
    const f = fixture({ machine: "references" });
    for (let index = 0; index < 4; index++) {
      f.controller.touchSticker();
      f.advance(550);
    }
    f.advance(1);
    f.controller.touchSticker();
    expect(f.controller.active).toBe("sticker");
    expect(f.shown.some(({ egg }) => egg === "hotdog")).toBe(false);
    f.advance(2201);
    f.controller.touchSticker();
    expect(f.controller.active).toBe("sticker");
    expect(f.shown.some(({ egg }) => egg === "hotdog")).toBe(false);
  });

  it("starts the next sequence from zero after a successful HOTDOG", () => {
    const f = fixture({ machine: "references" });
    for (let index = 0; index < 5; index++) f.controller.touchSticker();
    expect(f.controller.active).toBe("hotdog");
    f.controller.touchSticker();
    expect(f.controller.active).toBe("sticker");
    expect(f.shown.filter(({ egg }) => egg === "hotdog")).toHaveLength(1);
    for (let index = 0; index < 4; index++) f.controller.touchSticker();
    expect(f.shown.filter(({ egg }) => egg === "hotdog")).toHaveLength(2);
  });

  for (const machine of ["anduril", "scout", "portfolio", "unknown"]) {
    it(`rejects touch sequences on ${machine} and clears previous References taps`, () => {
      const f = fixture({ machine: "references" });
      for (let index = 0; index < 4; index++) f.controller.touchSticker();
      f.state.machine = machine;
      const shown = f.shown.length;
      for (let index = 0; index < 5; index++) expect(f.controller.touchSticker()).toBe(false);
      expect(f.shown).toHaveLength(shown);
      f.state.machine = "references";
      f.controller.touchSticker();
      expect(f.controller.active).toBe("sticker");
      expect(f.shown.some(({ egg }) => egg === "hotdog")).toBe(false);
    });
  }

  for (const [name, overrides] of unavailableStates) {
    it(`rejects ${name} touch sequences and clears accumulated taps`, () => {
      const f = fixture({ machine: "references" });
      for (let index = 0; index < 4; index++) f.controller.touchSticker();
      Object.assign(f.state, overrides);
      expect(f.controller.touchSticker()).toBe(false);
      Object.assign(f.state, { expanded: true, settled: true, visible: true, blocked: false });
      f.controller.touchSticker();
      expect(f.controller.active).toBe("sticker");
      expect(f.shown.some(({ egg }) => egg === "hotdog")).toBe(false);
    });
  }

  for (const newVisit of [false, true]) {
    it(`clears the touch sequence on reset(newVisit=${newVisit})`, () => {
      const f = fixture({ machine: "references" });
      for (let index = 0; index < 4; index++) f.controller.touchSticker();
      f.controller.reset(newVisit);
      expect(f.controller.active).toBeNull();
      f.controller.touchSticker();
      expect(f.controller.active).toBe("sticker");
      expect(f.shown.some(({ egg }) => egg === "hotdog")).toBe(false);
    });
  }

  it("clears a partial touch sequence on Escape", () => {
    const f = fixture({ machine: "references" });
    for (let index = 0; index < 4; index++) f.controller.touchSticker();
    f.controller.key(key("Escape"));
    expect(f.controller.active).toBeNull();
    f.controller.touchSticker();
    expect(f.controller.active).toBe("sticker");
    expect(f.shown.some(({ egg }) => egg === "hotdog")).toBe(false);
  });

  it("provides a static, silent HOTDOG in reduced-motion mode", () => {
    const f = fixture({ machine: "references", reducedMotion: true });
    for (let index = 0; index < 5; index++) f.controller.touchSticker();
    expect(f.shown.at(-1)).toEqual({ egg: "hotdog", reduced: true, at: 0 });
    expect(f.sounds).toEqual([]);
    expect(f.timerCount()).toBe(1);
  });

  it("never reactivates or schedules timers after disposal", () => {
    const f = fixture({ machine: "references" });
    for (let index = 0; index < 4; index++) f.controller.touchSticker();
    f.controller.dispose();
    const shown = f.shown.length;
    for (let index = 0; index < 6; index++) expect(f.controller.touchSticker()).toBe(false);
    expect(f.controller.active).toBeNull();
    expect(f.shown).toHaveLength(shown);
    expect(f.timerCount()).toBe(0);
  });
});

describe("opt-in sprite readiness", () => {
  it("does not start a blank timed sprite or queue its sound while decoding", () => {
    let ready = false;
    const f = fixture({}, (egg) => egg !== "sonar" || ready);
    const timers = f.timerCount();
    expect(f.controller.activate("sonar", true)).toBe(false);
    expect(f.controller.active).toBeNull();
    expect(f.shown).toHaveLength(0);
    expect(f.sounds).toHaveLength(0);
    expect(f.timerCount()).toBe(timers);
    ready = true;
    expect(f.shown).toHaveLength(0);
    expect(f.controller.activate("sonar", true)).toBe(true);
    expect(f.shown).toHaveLength(1);
    expect(f.sounds).toEqual(["sonar"]);
    f.controller.dispose();
  });
});

describe("PR19 navigation integration", () => {
  function target(attributes: string[] | null = null, control = false): Pick<Element, "closest"> {
    const button =
      attributes && ({ hasAttribute: (name: string) => attributes.includes(name) } as Element);
    return {
      closest: (selector: string) =>
        selector === "button" ? button : control ? ({} as Element) : null,
    };
  }
  it("allows only the explicit workbench action to grant its review unlock", () => {
    const earnedUnlock = { current: false };
    let state = createKonamiState("keyboard");
    const open = () => {
      earnedUnlock.current = true;
      state = Object.freeze({ ...state, unlocked: true });
    };
    expect(openFactoryForReview("off", open)).toBe(false);
    expect(openFactoryForReview("secret", open)).toBe(false);
    expect(earnedUnlock.current).toBe(false);
    expect(state.unlocked).toBe(false);
    for (const symbol of KONAMI_KEYBOARD_SEQUENCE) state = advanceKonami(state, symbol, "keyboard");
    expect(state.unlocked).toBe(true);
    state = createKonamiState("keyboard");
    expect(openFactoryForReview("review", open)).toBe(true);
    expect(earnedUnlock.current).toBe(true);
    expect(state.unlocked).toBe(true);
  });
  it("preserves baseline opt-outs for links, forms, navigation buttons and review buttons", () => {
    expect(factoryTouchMayStart(target())).toBe(true);
    expect(factoryTouchMayStart(target(["data-computer-enter"]))).toBe(true);
    expect(factoryTouchMayStart(target([]))).toBe(false);
    expect(factoryTouchMayStart(target(null, true))).toBe(false);
    expect(factoryTouchMayStart(target(["data-egg-hotspot"], true))).toBe(false);
  });
  for (const type of ["touch", "pen"]) {
    it(`keeps a ${type} hotspot tap activatable and a deliberate drag available for navigation`, () => {
      expect(factoryTouchMayStart(target(["data-egg-hotspot"]))).toBe(true);
      const press = { x: 150, y: 200, type };
      expect(factoryEggTouchTap(press, { clientX: 154, clientY: 202 })).toBe(true);
      expect(swipeSymbol(4, 2)).toBeNull();
      expect(factoryEggTouchTap(press, { clientX: 70, clientY: 203 })).toBe(false);
      expect(swipeSymbol(-80, 3)).toBe("←");
      expect(factoryEggTouchTap(press, { clientX: 151, clientY: 270 })).toBe(false);
      expect(swipeSymbol(1, 70)).toBe("↓");
    });
  }
  it("never treats a canceled press or mouse activation as the hidden touch sequence", () => {
    expect(factoryEggTouchTap(null, { clientX: 0, clientY: 0 })).toBe(false);
    expect(factoryEggTouchTap({ x: 0, y: 0, type: "mouse" }, { clientX: 0, clientY: 0 })).toBe(
      false,
    );
  });
});
