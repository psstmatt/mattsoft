import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import { useSound } from "../lib/sound";
import { RAINBOW_HOLD_MS, RAINBOW_FADE_MS, createRevealSchedule } from "../lib/experience-timing";

type ComputerScene = {
  enter: (surface: HTMLElement) => Promise<void>;
  dispose: () => void;
};
type ComputerModule = {
  mountComputer: (element: HTMLElement, signal: AbortSignal) => Promise<ComputerScene>;
};
type TransitionModule = {
  fadeToPortfolio: (
    overlay: HTMLElement,
    surface: HTMLElement,
    signal?: AbortSignal,
  ) => Promise<void>;
};
const transitionPath = "/experience/computer-transition.js?v=1";
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
  const { play, stop } = useSound();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [introOpen, setIntroOpen] = useState(pathname === "/");
  const [revealed, setRevealed] = useState(false);
  const [entering, setEntering] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const poster = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ComputerScene | null>(null);
  const transition = useRef<TransitionModule | null>(null);
  const abort = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const origin = useRef({ x: 0, y: 0, dragged: false });
  const reduced = useReducedMotion();

  const finish = useCallback(() => {
    abort.current?.abort();
    scene.current?.dispose();
    scene.current = null;
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
      setEntering(false);
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

  const enter = useCallback(
    async (skip = false) => {
      if (busy.current) return;
      busy.current = true;
      if (skip) stop();
      else play("computer-click");
      setEntering(true);
      try {
        if (!skip && !reduced && surface.current) {
          if (scene.current) await scene.current.enter(surface.current);
          else if (dialog.current && transition.current) {
            if (mounted.current)
              await transition.current.fadeToPortfolio(
                dialog.current,
                surface.current,
                abort.current?.signal,
              );
          }
        }
      } catch {
        // An unavailable preview never traps the visitor on the intro.
      } finally {
        finish();
      }
    },
    [finish, reduced, play, stop],
  );

  useEffect(() => {
    mounted.current = true;
    if (!introOpen) return;
    if (!document.documentElement.classList.contains("computer-entry")) {
      setIntroOpen(false);
      return;
    }
    const element = dialog.current;
    const content = surface.current;
    if (!element || !content) {
      finish();
      return;
    }
    content.inert = true;
    element.focus({ preventScroll: true });
    const controller = new AbortController();
    abort.current = controller;
    element.addEventListener(
      "computer-screen-on",
      () => {
        if (!busy.current) play("power");
      },
      { signal: controller.signal },
    );
    const materialPath = "/experience/computer-material.js?v=2";
    if (poster.current) {
      const canvas = poster.current;
      import(/* @vite-ignore */ materialPath)
        .then((module) => module.drawComputerPoster(canvas, controller.signal))
        .catch(() => {});
    }
    void import(/* @vite-ignore */ transitionPath)
      .then((module: TransitionModule) => {
        if (!controller.signal.aborted) transition.current = module;
      })
      .catch(() => {});
    const modulePath = "/experience/computer-scene.js?v=4";
    import(/* @vite-ignore */ modulePath)
      .then(async (module: ComputerModule) => {
        if (controller.signal.aborted) return;
        const instance = await module.mountComputer(element, controller.signal);
        if (controller.signal.aborted || busy.current) instance.dispose();
        else scene.current = instance;
      })
      .catch(() => {
        if (!controller.signal.aborted) element.dataset["fallback"] = "true";
      });
    return () => {
      controller.abort();
      scene.current?.dispose();
      scene.current = null;
      content.inert = false;
    };
  }, [finish, introOpen, play]);

  useEffect(() => {
    if (pathname !== "/" && introOpen) finish();
  }, [pathname, introOpen, finish]);

  useEffect(
    () => () => {
      mounted.current = false;
      abort.current?.abort();
      // StrictMode replays setup immediately; remove the class only for a real unmount.
      queueMicrotask(() => {
        if (!mounted.current)
          document.documentElement.classList.remove("computer-entry", "computer-handover");
      });
    },
    [],
  );

  return (
    <>
      {introOpen && (
        <section
          ref={dialog}
          className="portfolio-computer"
          data-computer-entrance
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-label="Enter Matt’s portfolio"
          onPointerDown={(event) => {
            origin.current = {
              x: event.clientX,
              y: event.clientY,
              dragged: false,
            };
          }}
          onPointerMove={(event) => {
            if (
              event.buttons &&
              Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10
            )
              origin.current.dragged = true;
          }}
          onClickCapture={(event) => {
            if (origin.current.dragged) {
              event.preventDefault();
              event.stopPropagation();
              origin.current.dragged = false;
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              void enter(true);
            }
            if (event.key === "Tab") {
              const buttons = [
                ...(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ??
                  []),
              ];
              const first = buttons[0],
                last = buttons[buttons.length - 1];
              if (
                event.shiftKey &&
                (document.activeElement === first || document.activeElement === dialog.current)
              ) {
                event.preventDefault();
                last?.focus();
              }
              if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <canvas
            ref={poster}
            className="computer-poster"
            width="1024"
            height="1024"
            aria-hidden="true"
          />
          <div className="computer-stage" data-computer-stage aria-hidden="true" />
          <button
            ref={enterButton}
            className="computer-screen-hit"
            data-computer-enter
            aria-label="Enter the portfolio"
            disabled={entering}
            onClick={() => void enter()}
          />
          <button className="computer-skip" disabled={entering} onClick={() => void enter(true)}>
            Skip intro
          </button>
        </section>
      )}
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
