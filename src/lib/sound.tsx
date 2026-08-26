import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";

type Tone = "hover" | "click" | "reveal" | "toggle";

type SoundApi = {
  enabled: boolean;
  toggle: () => void;
  play: (tone: Tone) => void;
};

const SoundContext = createContext<SoundApi>({
  enabled: true,
  toggle: () => {},
  play: () => {},
});


const RECIPES: Record<Tone, { freq: number; to: number; gain: number; dur: number; type: OscillatorType }> = {
  hover: { freq: 1180, to: 1180, gain: 0.014, dur: 0.045, type: "sine" },
  click: { freq: 420, to: 300, gain: 0.05, dur: 0.09, type: "triangle" },
  reveal: { freq: 620, to: 880, gain: 0.018, dur: 0.16, type: "sine" },
  toggle: { freq: 540, to: 760, gain: 0.045, dur: 0.12, type: "sine" },
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = true;
  const ctxRef = useRef<AudioContext | null>(null);
  const lastRef = useRef(0);


  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, []);

  const emit = useCallback(
    (tone: Tone) => {
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      // rate limit rapid hover fire
      if (tone === "hover" && now - lastRef.current < 0.05) return;
      lastRef.current = now;

      const r = RECIPES[tone];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = r.type;
      osc.frequency.setValueAtTime(r.freq, now);
      if (r.to !== r.freq) osc.frequency.exponentialRampToValueAtTime(r.to, now + r.dur);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(r.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + r.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + r.dur + 0.02);
    },
    [getCtx],
  );

  const play = useCallback(
    (tone: Tone) => {
      try {
        emit(tone);
      } catch {
        /* ignore */
      }
    },
    [emit],
  );

  const toggle = useCallback(() => {}, []);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  return useContext(SoundContext);
}
