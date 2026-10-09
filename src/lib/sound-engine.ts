export type Tone = "hover" | "click" | "reveal" | "toggle" | "power" | "computer-click";
export const GESTURE_SOUND_DEADLINE_MS = 1000;

type SoundRecipe = {
  freq: number;
  to: number;
  gain: number;
  dur: number;
  type: OscillatorType;
  linearAttack?: boolean;
};
const RECIPES: Record<Tone, SoundRecipe> = {
  hover: { freq: 1180, to: 1180, gain: 0.014, dur: 0.045, type: "sine" },
  click: { freq: 420, to: 300, gain: 0.05, dur: 0.09, type: "triangle" },
  reveal: { freq: 620, to: 880, gain: 0.018, dur: 0.16, type: "sine" },
  toggle: { freq: 540, to: 760, gain: 0.045, dur: 0.12, type: "sine" },
  power: { freq: 330, to: 660, gain: 0.022, dur: 0.34, type: "sine" },
  "computer-click": { freq: 1400, to: 380, gain: 0.04, dur: 0.045, type: "triangle" },
};

export function createSoundPlayer(
  createContext: () => AudioContext | null,
  enabled = true,
  clock = () => performance.now(),
) {
  let context: AudioContext | null = null;
  let disposed = false;
  let generation = 0;
  let powerAttempted = false;
  let lastHover = -Infinity;
  const voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();

  function stop() {
    generation++;
    for (const voice of voices) {
      try {
        voice.oscillator.stop();
      } catch {
        /* Already ended. */
      }
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    voices.clear();
  }

  function emitRecipe(recipe: SoundRecipe, delay = 0) {
    if (!context || context.state !== "running" || !enabled || disposed) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const voice = { oscillator, gain };
    oscillator.type = recipe.type;
    oscillator.frequency.setValueAtTime(recipe.freq, now);
    if (recipe.to !== recipe.freq)
      oscillator.frequency.exponentialRampToValueAtTime(recipe.to, now + recipe.dur);
    gain.gain.setValueAtTime(recipe.linearAttack ? 0 : 0.0001, now);
    if (recipe.linearAttack) gain.gain.linearRampToValueAtTime(recipe.gain, now + 0.007);
    else gain.gain.exponentialRampToValueAtTime(recipe.gain, now + Math.min(0.008, recipe.dur / 4));
    gain.gain.exponentialRampToValueAtTime(
      recipe.linearAttack ? 0.000015 : 0.0001,
      now + recipe.dur,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(voice);
    };
    voices.add(voice);
    oscillator.start(now);
    oscillator.stop(now + recipe.dur + 0.02);
  }

  function emit(tone: Tone) {
    if (!context || context.state !== "running") return;
    if (tone === "hover" && context.currentTime - lastHover < 0.05) return;
    if (tone === "hover") lastHover = context.currentTime;
    emitRecipe(RECIPES[tone]);
  }

  function withContext(gesture: boolean, allowResume: boolean, emitNow: () => void) {
    if (!enabled) return;
    try {
      // A blocked startup attempt must not own the first user-activated sound.
      // Also recover a closed/interrupted mobile context in the next real gesture.
      if (gesture && context && context.state !== "running") {
        const previous = context;
        stop();
        context = null;
        lastHover = -Infinity;
        void previous.close().catch(() => {});
      }
      context ??= createContext();
      if (!context) return;
      if (context.state === "running") {
        emitNow();
        return;
      }
      // Never queue a power-on chime in a suspended context. It belongs to this frame only.
      if (!allowResume) return;
      const request = ++generation;
      const requestedAt = clock();
      void context
        .resume()
        .then(() => {
          // Resume only from an actual control activation; discard stale or cancelled clicks.
          if (request === generation && clock() - requestedAt <= GESTURE_SOUND_DEADLINE_MS)
            emitNow();
        })
        .catch(() => {});
    } catch {
      /* Audio is optional; the visual experience continues. */
    }
  }

  function play(tone: Tone, gesture = false) {
    if (disposed) return;
    // A newer activation supersedes an earlier pending resume, even when already running.
    if (gesture) generation++;
    if (tone === "power") {
      if (powerAttempted) return;
      powerAttempted = true;
    }
    if (tone === "computer-click") {
      powerAttempted = true;
      stop();
    }
    withContext(gesture, gesture && tone !== "power", () => emit(tone));
  }

  function konamiFeedback(symbol: string, matched: boolean, durationMs = 360) {
    if (disposed) return;
    powerAttempted = true;
    stop();
    const started = clock();
    withContext(true, true, () => {
      const elapsed = clock() - started;
      // Feedback belongs to the input animation. Do not replay it after its landing.
      if (elapsed >= durationMs) return;
      if (!matched) {
        emitRecipe({
          freq: 150,
          to: 115,
          gain: 0.0195,
          dur: 0.07,
          type: "sine",
          linearAttack: true,
        });
        return;
      }
      const frequency =
        ({ "↑": 392, "↓": 196, "←": 294, "→": 330, B: 440, A: 523 } as Record<string, number>)[
          symbol
        ] ?? 262;
      emitRecipe({
        freq: frequency,
        to: frequency * 0.86,
        gain: 0.0255,
        dur: 0.08,
        type: "sine",
        linearAttack: true,
      });
      const landingDelay = (durationMs * 0.74 - elapsed) / 1000;
      if (landingDelay > 0)
        emitRecipe(
          { freq: 105, to: 62, gain: 0.00825, dur: 0.065, type: "sine", linearAttack: true },
          landingDelay,
        );
    });
  }

  function konamiUnlock() {
    if (disposed) return;
    powerAttempted = true;
    stop();
    const started = clock();
    withContext(true, true, () => {
      if (clock() - started >= 650) return;
      [392, 493.88, 587.33, 783.99].forEach((frequency, index) =>
        emitRecipe(
          {
            freq: frequency,
            to: frequency,
            gain: 0.018,
            dur: 0.17,
            type: "sine",
            linearAttack: true,
          },
          index * 0.085,
        ),
      );
    });
  }

  return {
    play,
    konamiFeedback,
    konamiUnlock,
    stop,
    isEnabled: () => enabled,
    setEnabled(next: boolean) {
      enabled = next;
      stop();
    },
    dispose() {
      disposed = true;
      stop();
      void context?.close().catch(() => {});
    },
  };
}
