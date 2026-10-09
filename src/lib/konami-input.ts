export type KonamiMode = "keyboard" | "touch";
export type ArrowSymbol = "↑" | "↓" | "←" | "→";

export const KONAMI_KEYBOARD_SEQUENCE = Object.freeze([
  "↑",
  "↑",
  "↓",
  "↓",
  "←",
  "→",
  "←",
  "→",
  "B",
  "A",
] as const);
export const KONAMI_TOUCH_SEQUENCE = Object.freeze(KONAMI_KEYBOARD_SEQUENCE.slice(0, 8));

export interface KonamiState {
  readonly mode: KonamiMode;
  readonly history: readonly string[];
  readonly prefix: readonly string[];
  readonly unlocked: boolean;
}

export function createKonamiState(mode: KonamiMode): KonamiState {
  return Object.freeze({
    mode,
    history: Object.freeze([]),
    prefix: Object.freeze([]),
    unlocked: false,
  });
}

export function advanceKonami(state: KonamiState, symbol: string, mode: KonamiMode): KonamiState {
  if (state.unlocked) return state;

  const sameMode = state.mode === mode;
  const target = mode === "touch" ? KONAMI_TOUCH_SEQUENCE : KONAMI_KEYBOARD_SEQUENCE;
  const candidate = [...(sameMode ? state.prefix : []), symbol];
  let prefix: string[] = [];

  // Preserve the longest matching suffix so an extra up can start the code again.
  for (let length = Math.min(target.length, candidate.length); length > 0; length--) {
    const tail = candidate.slice(-length);
    if (tail.every((value, index) => value === target[index])) {
      prefix = tail;
      break;
    }
  }

  return Object.freeze({
    mode,
    history: Object.freeze([...(sameMode ? state.history : []), symbol].slice(-10)),
    prefix: Object.freeze(prefix),
    unlocked: prefix.length === target.length,
  });
}

export interface KonamiKeyboardEvent {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  readonly repeat?: boolean;
}

const KEYBOARD_ARROWS: Readonly<Record<string, ArrowSymbol>> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

export function keyboardSymbol(event: KonamiKeyboardEvent): string | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.key === " ") {
    return null;
  }

  return KEYBOARD_ARROWS[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : null);
}

export function swipeSymbol(dx: number, dy: number): ArrowSymbol | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 32) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "←" : "→") : dy < 0 ? "↑" : "↓";
}

export interface KonamiMotion {
  frames: { transform: string; offset?: number }[];
  duration: number;
  easing: string;
  label: string;
}

const MOTION_LABELS: Readonly<Record<string, string>> = {
  "↑": "HOP",
  "↓": "SQUISH",
  "←": "LEFT",
  "→": "RIGHT",
  B: "BOOP",
  A: "LEVEL UP",
};

/** The selected Soft Spring recipe; the caller owns animation and reduced motion. */
export function softSpringMotion(symbol: string, matched: number): KonamiMotion {
  const easing = "cubic-bezier(.22,.72,.28,1)";
  if (matched === 0) {
    return {
      frames: [
        { transform: "none" },
        { transform: "translateX(-5px)", offset: 0.25 },
        { transform: "translateX(5px)", offset: 0.55 },
        { transform: "none" },
      ],
      duration: 190,
      easing,
      label: "TRY AGAIN",
    };
  }

  const direction = symbol === "←" ? -1 : symbol === "→" ? 1 : 0;
  const lift = symbol === "↑" ? -28 : symbol === "↓" ? 9 : -5;
  return {
    frames: [
      { transform: "none" },
      { transform: "translateY(4px) scale(1.025,.96)", offset: 0.13 },
      {
        transform: `translate(${direction * 22}px,${lift}px) rotate(${direction * 4}deg) scale(${symbol === "↓" ? "1.11,.84" : ".97,1.035"})`,
        offset: 0.38,
      },
      { transform: "translateY(3px) scale(1.035,.965)", offset: 0.74 },
      { transform: "none" },
    ],
    duration: 360,
    easing,
    label: MOTION_LABELS[symbol] ?? "INPUT",
  };
}
