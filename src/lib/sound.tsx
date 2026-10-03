import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { createSoundPlayer, type Tone } from "./sound-engine";

type SoundApi = {
  play: (tone: Tone) => void;
  stop: () => void;
};

const SoundContext = createContext<SoundApi>({ play() {}, stop() {} });

export function SoundProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = createSoundPlayer(() => {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        return Ctor ? new Ctor() : null;
      });
    }
    return playerRef.current;
  }, []);

  useEffect(() => {
    const cancelPendingAudio = () => playerRef.current?.stop();
    const onVisibility = () => {
      if (document.hidden) cancelPendingAudio();
    };
    window.addEventListener("pagehide", cancelPendingAudio);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", cancelPendingAudio);
      document.removeEventListener("visibilitychange", onVisibility);
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  const play = useCallback(
    (tone: Tone) => {
      if (
        document.documentElement.classList.contains("computer-entry") &&
        tone !== "power" &&
        tone !== "computer-click"
      )
        return;
      getPlayer().play(tone, tone === "click" || tone === "toggle" || tone === "computer-click");
    },
    [getPlayer],
  );
  const stop = useCallback(() => getPlayer().stop(), [getPlayer]);
  const value = useMemo(() => ({ play, stop }), [play, stop]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  return useContext(SoundContext);
}
