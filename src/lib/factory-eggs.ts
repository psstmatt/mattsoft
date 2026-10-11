/** Secret factory interactions. No timers, listeners, or audio exist until the earned deck opens. */
export type FactoryEgg = "sonar" | "valve" | "sticker" | "lan" | "hotdog";
export type FactoryEggMode = "off" | "secret" | "review";
export const FACTORY_EGG_IDLE_MS = 45_000;
export const FACTORY_EGG_DURATION: Record<FactoryEgg, number> = {
  sonar: 2900,
  valve: 2600,
  sticker: 2800,
  lan: 2400,
  hotdog: 4000,
};
export function factoryEggMode(search: string, hostname = "localhost"): FactoryEggMode {
  // Production always uses secret discovery. Queries cannot reveal review controls or unlock.
  if (hostname === "psstmatt.com" || hostname.endsWith(".psstmatt.com")) return "secret";
  const mode = new URLSearchParams(search).get("eggs");
  return mode === "review" ? "review" : mode === "1" ? "secret" : "off";
}
export type EggEnvironment = {
  expanded: boolean;
  settled: boolean;
  visible: boolean;
  blocked: boolean;
  pointerDown: boolean;
  reducedMotion: boolean;
  machine: string;
};
export function eggAvailable(state: EggEnvironment) {
  return state.expanded && state.settled && state.visible && !state.blocked;
}
export function eggMatchesMachine(egg: FactoryEgg, machine: string) {
  return (
    !["sonar", "valve", "sticker"].includes(egg) ||
    ({ sonar: "anduril", valve: "scout", sticker: "references" } as Record<string, string>)[egg] ===
      machine
  );
}
export type EggKey = Pick<
  KeyboardEvent,
  "key" | "repeat" | "isComposing" | "ctrlKey" | "altKey" | "metaKey" | "defaultPrevented"
>;
export function createFactoryEggController({
  environment,
  canShow = () => true,
  show,
  clear,
  sound,
  now = () => performance.now(),
  schedule = (fn, ms) => setTimeout(fn, ms),
  unschedule = (timer) => clearTimeout(timer),
}: {
  environment: () => EggEnvironment;
  canShow?: (egg: FactoryEgg) => boolean;
  show: (egg: FactoryEgg, reduced: boolean) => void;
  clear: () => void;
  sound: (egg: "sonar" | "valve") => void;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  unschedule?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  let active: FactoryEgg | null = null;
  let expiration: ReturnType<typeof setTimeout> | undefined;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let idlePlayed = false;
  let lastActivity = now();
  let prefix = "";
  let lastKey = -Infinity;
  let stickerTaps: number[] = [];
  function cancel() {
    if (expiration !== undefined) unschedule(expiration);
    expiration = undefined;
    active = null;
    clear(); // Synchronous: Escape may continue to existing navigation in this event.
  }
  function armIdle() {
    if (idle !== undefined) unschedule(idle);
    idle = undefined;
    const state = environment();
    if (disposed || idlePlayed || !eggAvailable(state) || state.pointerDown || state.reducedMotion)
      return;
    idle = schedule(
      () => {
        idle = undefined;
        activate("lan", false, true);
      },
      Math.max(0, FACTORY_EGG_IDLE_MS - (now() - lastActivity)),
    );
  }
  function activate(egg: FactoryEgg, gesture = false, automatic = false) {
    const state = environment();
    if (disposed || !eggAvailable(state) || !eggMatchesMachine(egg, state.machine) || !canShow(egg))
      return false;
    if (egg === "lan" && state.pointerDown) return false;
    if (
      automatic &&
      (egg !== "lan" ||
        idlePlayed ||
        state.reducedMotion ||
        now() - lastActivity < FACTORY_EGG_IDLE_MS)
    )
      return false;
    cancel();
    if (egg === "lan") idlePlayed = true;
    active = egg;
    lastActivity = now();
    show(egg, state.reducedMotion);
    if (gesture && (egg === "sonar" || egg === "valve")) sound(egg);
    expiration = schedule(
      () => {
        expiration = undefined;
        cancel();
        armIdle();
      },
      state.reducedMotion && (egg === "sonar" || egg === "valve")
        ? 2000
        : FACTORY_EGG_DURATION[egg],
    );
    armIdle();
    return true;
  }
  function activity() {
    lastActivity = now();
    if (active === "lan") cancel();
    armIdle();
  }
  function key(event: EggKey) {
    activity();
    if (event.key === "Escape") {
      cancel();
      prefix = "";
      stickerTaps = [];
      return false;
    }
    const state = environment();
    if (
      !eggAvailable(state) ||
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.key.length !== 1
    ) {
      prefix = "";
      return false;
    }
    if (now() - lastKey > 1600) prefix = "";
    lastKey = now();
    const candidate = prefix + event.key.toUpperCase();
    prefix = "";
    for (let n = Math.min(6, candidate.length); n > 0; n--)
      if ("HOTDOG".startsWith(candidate.slice(-n))) {
        prefix = candidate.slice(-n);
        break;
      }
    if (prefix !== "HOTDOG") return false;
    prefix = "";
    return activate("hotdog");
  }
  function touchSticker() {
    const state = environment();
    if (!eggAvailable(state) || state.machine !== "references") {
      stickerTaps = [];
      return false;
    }
    stickerTaps = [...stickerTaps.filter((time) => now() - time <= 2200), now()];
    if (stickerTaps.length < 5) return activate("sticker");
    stickerTaps = [];
    return activate("hotdog");
  }
  function reset(newVisit = false) {
    cancel();
    prefix = "";
    stickerTaps = [];
    if (newVisit) idlePlayed = false;
    lastActivity = now();
    armIdle();
  }
  armIdle();
  return {
    activate,
    touchSticker,
    activity,
    key,
    reset,
    cancel,
    get active() {
      return active;
    },
    dispose() {
      disposed = true;
      if (idle !== undefined) unschedule(idle);
      idle = undefined;
      cancel();
    },
  };
}

/** Keep the workbench's explicit unlock incapable of leaking into secret/off modes. */
export function openFactoryForReview(mode: FactoryEggMode, open: () => void) {
  if (mode !== "review") return false;
  open();
  return true;
}

/** Native screen/egg buttons retain taps; only unrelated controls opt out of swipes. */
export function factoryTouchMayStart(target: Pick<Element, "closest">) {
  if (target.closest("a, input, textarea, select")) return false;
  const button = target.closest("button");
  return (
    !button || button.hasAttribute("data-computer-enter") || button.hasAttribute("data-egg-hotspot")
  );
}

export function factoryEggTouchTap(
  press: { x: number; y: number; type: string } | null,
  point: { clientX: number; clientY: number },
) {
  return (
    !!press &&
    (press.type === "touch" || press.type === "pen") &&
    Math.hypot(point.clientX - press.x, point.clientY - press.y) <= 8
  );
}
