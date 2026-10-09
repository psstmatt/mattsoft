import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SecretComputerDeck } from "./secret-computer-deck";
import { RAINBOW_HOLD_MS, RAINBOW_FADE_MS, createRevealSchedule } from "../lib/experience-timing";

type RainbowModule = {
  mountHeroShader: (
    element: HTMLElement,
    definition: unknown,
    signal: AbortSignal,
    revealMs: number,
  ) => Promise<boolean>;
};

export const COMPUTER_BOOTSTRAP = `(function(){if(location.pathname!=='/'||new URLSearchParams(location.search).has('screen'))return;var n=performance.getEntriesByType('navigation')[0];if(n&&n.type==='back_forward')return;document.documentElement.classList.add('computer-entry');})();`;

function RainbowReveal({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);
  const [phase, setPhase] = useState<"waiting" | "visible" | "fading" | "done">("waiting");
  useEffect(() => {
    if (!active || hasPlayed.current) return;
    hasPlayed.current = true;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controller = new AbortController();
    const cancel = createRevealSchedule({
      holdMs: RAINBOW_HOLD_MS,
      fadeMs: reduced ? 0 : RAINBOW_FADE_MS,
      visible: () => setPhase("visible"),
      fade: () => setPhase("fading"),
      done: () => {
        setPhase("done");
        controller.abort();
      },
    });
    const element = host.current;
    if (element && !reduced) {
      const runtimePath = "/experience/rainbow-runtime.js";
      const spectrumPath = "/experience/rainbow-spectrum.js";
      Promise.all([import(/* @vite-ignore */ runtimePath), import(/* @vite-ignore */ spectrumPath)])
        .then(async ([runtime, spectrum]) => {
          if (!controller.signal.aborted) {
            const ready = await (runtime as RainbowModule).mountHeroShader(
              element,
              spectrum.default,
              controller.signal,
              650,
            );
            if (ready && !controller.signal.aborted) element.dataset["shaderReady"] = "true";
          }
        })
        .catch(() => {
          /* The CSS rainbow remains available without WebGL. */
        });
    }
    return () => {
      cancel();
      controller.abort();
      setPhase("done");
    };
  }, [active]);
  return (
    <div
      ref={host}
      data-rainbow
      data-phase={active ? phase : "waiting"}
      className="portfolio-rainbow"
      aria-hidden="true"
    />
  );
}

export function PortfolioExperience({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [introOpen, setIntroOpen] = useState(pathname === "/");
  const [revealed, setRevealed] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  const finish = useCallback(() => {
    document.documentElement.classList.remove("computer-entry", "computer-handover");
    const content = surface.current;
    if (content) {
      content.inert = false;
      Object.assign(content.style, {
        transform: "",
        transformOrigin: "",
        clipPath: "",
        opacity: "",
      });
    }
    if (mounted.current) {
      setIntroOpen(false);
      setRevealed(true);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    const main = content?.querySelector("main");
    if (main instanceof HTMLElement) {
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
    }
    window.dispatchEvent(new Event("resize"));
  }, []);

  useEffect(() => {
    if (!introOpen) return;
    if (!document.documentElement.classList.contains("computer-entry")) {
      setIntroOpen(false);
      return;
    }
    const content = surface.current;
    if (content) content.inert = true;
    return () => {
      if (content) content.inert = false;
    };
  }, [introOpen]);
  useEffect(() => {
    if (pathname !== "/" && introOpen) finish();
  }, [pathname, introOpen, finish]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current)
          document.documentElement.classList.remove("computer-entry", "computer-handover");
      });
    };
  }, []);

  return (
    <>
      {introOpen && <SecretComputerDeck surface={surface} onComplete={finish} />}
      <div
        ref={surface}
        className="min-h-screen portfolio-surface"
        data-portfolio-surface
        id="top"
        tabIndex={-1}
      >
        <RainbowReveal active={revealed && pathname === "/"} />
        {children}
      </div>
    </>
  );
}
