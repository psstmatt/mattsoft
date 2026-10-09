import { describe, expect, it } from "bun:test";
import {
  advanceKonami,
  createKonamiState,
  keyboardSymbol,
  softSpringMotion,
  swipeSymbol,
  type KonamiMode,
  type KonamiState,
} from "../src/lib/konami-input";

const arrows = ["↑", "↑", "↓", "↓", "←", "→", "←", "→"];

function enter(
  symbols: readonly string[],
  mode: KonamiMode,
  state = createKonamiState(mode),
): KonamiState {
  return symbols.reduce((current, symbol) => advanceKonami(current, symbol, mode), state);
}

describe("Konami sequence", () => {
  it("requires all ten keyboard inputs, including B then A", () => {
    let state = createKonamiState("keyboard");
    for (const [index, symbol] of [...arrows, "B", "A"].entries()) {
      state = advanceKonami(state, symbol, "keyboard");
      expect(state.prefix.length).toBe(index + 1);
      expect(state.unlocked).toBe(index === 9);
    }
    expect(state.history).toEqual([...arrows, "B", "A"]);
  });

  it("unlocks touch after the eight arrows without letters", () => {
    const state = enter(arrows.slice(0, -1), "touch");
    expect(state.unlocked).toBe(false);
    const unlocked = advanceKonami(state, "→", "touch");
    expect(unlocked.unlocked).toBe(true);
    expect(unlocked.prefix).toEqual(arrows);
  });

  it("resets partial progress and displayed history when the input mode changes", () => {
    const keyboard = enter(["↑", "↑", "↓"], "keyboard");
    const touch = advanceKonami(keyboard, "↓", "touch");
    expect(touch).toEqual({ mode: "touch", prefix: [], history: ["↓"], unlocked: false });

    const touchStart = advanceKonami(keyboard, "↑", "touch");
    expect(touchStart.prefix).toEqual(["↑"]);
    expect(touchStart.history).toEqual(["↑"]);
    const keyboardAgain = advanceKonami(touchStart, "↑", "keyboard");
    expect(keyboardAgain.prefix).toEqual(["↑"]);
    expect(keyboardAgain.history).toEqual(["↑"]);
  });

  it("retains an overlapping start and recovers from an ordinary wrong key", () => {
    const overlap = enter(["↑", "↑", "↑"], "keyboard");
    expect(overlap.prefix).toEqual(["↑", "↑"]);
    expect(enter([...arrows.slice(2), "B", "A"], "keyboard", overlap).unlocked).toBe(true);

    const mistake = enter(["↑", "↑", "↓", "X"], "keyboard");
    expect(mistake.prefix).toEqual([]);
    expect(mistake.history.at(-1)).toBe("X");
    expect(enter([...arrows, "B", "A"], "keyboard", mistake).unlocked).toBe(true);

    const restart = enter(["↑", "↑", "↓", "↑"], "touch");
    expect(restart.prefix).toEqual(["↑"]);
    expect(enter(arrows.slice(1), "touch", restart).unlocked).toBe(true);
  });

  it("bounds display history to ten inputs without losing sequence progress", () => {
    const state = enter(["X", "Y", "Z", ...arrows, "B", "A"], "keyboard");
    expect(state.history).toEqual([...arrows, "B", "A"]);
    expect(state.prefix).toEqual([...arrows, "B", "A"]);
    expect(state.unlocked).toBe(true);
  });

  it("ignores all inputs and mode changes after unlocking", () => {
    const state = enter(arrows, "touch");
    expect(advanceKonami(state, "X", "touch")).toBe(state);
    expect(advanceKonami(state, "↑", "keyboard")).toBe(state);
  });

  it("does not mutate earlier state or expose mutable state arrays", () => {
    const start = createKonamiState("keyboard");
    const first = advanceKonami(start, "↑", "keyboard");
    const second = advanceKonami(first, "↑", "keyboard");
    expect(start.prefix).toEqual([]);
    expect(start.history).toEqual([]);
    expect(first.prefix).toEqual(["↑"]);
    expect(first.history).toEqual(["↑"]);
    expect(second.prefix).toEqual(["↑", "↑"]);
    for (const state of [start, first, second]) {
      expect(Object.isFrozen(state)).toBe(true);
      expect(Object.isFrozen(state.prefix)).toBe(true);
      expect(Object.isFrozen(state.history)).toBe(true);
    }
  });
});

describe("input normalization", () => {
  it("maps arrows, uppercases letters, and keeps ordinary wrong-key feedback", () => {
    expect(
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "b", "a", "x", "?", "7"].map((key) =>
        keyboardSymbol({ key }),
      ),
    ).toEqual(["↑", "↓", "←", "→", "B", "A", "X", "?", "7"]);
  });

  it("ignores modified shortcuts, repeats, Space, and non-character keys", () => {
    for (const modifier of ["ctrlKey", "metaKey", "altKey", "repeat"] as const) {
      expect(keyboardSymbol({ key: "ArrowUp", [modifier]: true })).toBeNull();
      expect(keyboardSymbol({ key: "a", [modifier]: true })).toBeNull();
    }
    for (const key of [" ", "Space", "Spacebar", "Tab", "Shift", "Enter", "Escape", "F1", ""]) {
      expect(keyboardSymbol({ key })).toBeNull();
    }
    expect(keyboardSymbol({ key: "B", ctrlKey: false, repeat: false })).toBe("B");
  });

  it("requires at least 32px on an axis and follows the dominant axis", () => {
    expect(swipeSymbol(0, 0)).toBeNull();
    expect(swipeSymbol(31.99, -31.99)).toBeNull();
    expect(swipeSymbol(32, 0)).toBe("→");
    expect(swipeSymbol(-32, 0)).toBe("←");
    expect(swipeSymbol(0, -32)).toBe("↑");
    expect(swipeSymbol(0, 32)).toBe("↓");
    expect(swipeSymbol(-45, 40)).toBe("←");
    expect(swipeSymbol(45, -40)).toBe("→");
    expect(swipeSymbol(40, -45)).toBe("↑");
    expect(swipeSymbol(-40, 45)).toBe("↓");
    expect(swipeSymbol(32, -32)).toBe("↑");
    expect(swipeSymbol(-32, 32)).toBe("↓");
    expect(swipeSymbol(Number.NaN, 50)).toBeNull();
    expect(swipeSymbol(50, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("selected Soft Spring motion", () => {
  it("uses the selected spring timing, compression, landing, and easing", () => {
    const motion = softSpringMotion("↑", 1);
    expect(motion.duration).toBe(360);
    expect(motion.easing).toBe("cubic-bezier(.22,.72,.28,1)");
    expect(motion.frames).toEqual([
      { transform: "none" },
      { transform: "translateY(4px) scale(1.025,.96)", offset: 0.13 },
      { transform: "translate(0px,-28px) rotate(0deg) scale(.97,1.035)", offset: 0.38 },
      { transform: "translateY(3px) scale(1.035,.965)", offset: 0.74 },
      { transform: "none" },
    ]);
    expect(motion.label).toBe("HOP");
  });

  it("gives every matched symbol its selected movement and neutral endpoints", () => {
    const expected = [
      ["↓", "translate(0px,9px) rotate(0deg) scale(1.11,.84)", "SQUISH"],
      ["←", "translate(-22px,-5px) rotate(-4deg) scale(.97,1.035)", "LEFT"],
      ["→", "translate(22px,-5px) rotate(4deg) scale(.97,1.035)", "RIGHT"],
      ["B", "translate(0px,-5px) rotate(0deg) scale(.97,1.035)", "BOOP"],
      ["A", "translate(0px,-5px) rotate(0deg) scale(.97,1.035)", "LEVEL UP"],
    ] as const;
    for (const [symbol, transform, label] of expected) {
      const motion = softSpringMotion(symbol, 1);
      expect(motion.frames[2]).toEqual({ transform, offset: 0.38 });
      expect(motion.frames[0]).toEqual({ transform: "none" });
      expect(motion.frames.at(-1)).toEqual({ transform: "none" });
      expect(motion.duration).toBe(360);
      expect(motion.label).toBe(label);
    }
  });

  it("shakes only when no sequence prefix matches, including a wrong arrow", () => {
    for (const symbol of ["X", "↓"]) {
      expect(softSpringMotion(symbol, 0)).toEqual({
        frames: [
          { transform: "none" },
          { transform: "translateX(-5px)", offset: 0.25 },
          { transform: "translateX(5px)", offset: 0.55 },
          { transform: "none" },
        ],
        duration: 190,
        easing: "cubic-bezier(.22,.72,.28,1)",
        label: "TRY AGAIN",
      });
    }
    const overlap = enter(["↑", "↑", "↑"], "keyboard");
    expect(softSpringMotion("↑", overlap.prefix.length).label).toBe("HOP");
  });
});
