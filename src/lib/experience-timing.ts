export const RAINBOW_HOLD_MS = 4000;
export const RAINBOW_FADE_MS = 900;

// Called only when the completed computer transition reveals the portfolio.
export function createRevealSchedule({
  holdMs = RAINBOW_HOLD_MS,
  fadeMs = RAINBOW_FADE_MS,
  visible,
  fade,
  done,
  schedule = setTimeout,
  unschedule = clearTimeout,
}: {
  holdMs?: number;
  fadeMs?: number;
  visible: () => void;
  fade: () => void;
  done: () => void;
  schedule?: typeof setTimeout;
  unschedule?: typeof clearTimeout;
}) {
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  visible();
  const holdTimer = schedule(() => {
    fade();
    fadeTimer = schedule(done, fadeMs);
  }, holdMs);
  return () => {
    unschedule(holdTimer);
    if (fadeTimer !== undefined) unschedule(fadeTimer);
  };
}
