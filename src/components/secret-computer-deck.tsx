import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
} from "react";
import { useReducedMotion } from "motion/react";
import { useSound } from "@/lib/sound";
import {
  advanceKonami,
  createKonamiState,
  keyboardSymbol,
  softSpringMotion,
  swipeSymbol,
  type KonamiMode,
} from "@/lib/konami-input";

type InputScreen = {
  history: readonly string[];
  matched: number;
  total: number;
  variant: "spring";
  unlocked: boolean;
  move: string;
  preview: boolean;
};
type Scene = {
  enter: (surface?: HTMLElement) => Promise<void>;
  resetEntry?: () => Promise<void>;
  dispose: () => void;
  setInput?: (input: InputScreen) => void;
  setVisible?: (visible: boolean) => void;
  setActive?: (active: boolean) => void;
};
type SceneOptions = {
  material?: "inflatable";
  initiallyVisible?: boolean;
  entryMotion?: "absurd";
};
type SceneModule = {
  mountComputer: (
    element: HTMLElement,
    signal: AbortSignal,
    options?: SceneOptions,
  ) => Promise<Scene>;
};
type CanvasModule = {
  mountCanvasComputer: (
    element: HTMLElement,
    signal: AbortSignal,
    options: SceneOptions,
  ) => Promise<Scene>;
};
const destinations = [
  {
    kind: "portfolio",
    label: "Portfolio",
    domain: "psstmatt.com",
    detail: "Original green",
    url: null,
  },
  {
    kind: "scout",
    label: "Scout",
    domain: "scout.psstmatt.com",
    detail: "Inflatable vinyl",
    url: "https://scout.psstmatt.com/",
  },
  {
    kind: "references",
    label: "References",
    domain: "references.psstmatt.com",
    detail: "Puffy vinyl · chrome foil",
    url: "https://references.psstmatt.com/",
  },
] as const;
const paths = {
  computer: "/experience/konami-computer-scene.js?v=ship-absurd-1",
  canvas: "/experience/konami-canvas-scene.js?v=ship-absurd-1",
  material: "/experience/computer-material.js?v=2",
  transition: "/experience/computer-transition.js?v=1",
};

export function SecretComputerDeck({
  surface,
  onComplete,
}: {
  surface: RefObject<HTMLDivElement | null>;
  onComplete: () => void;
}) {
  const { play, stop, konamiFeedback, konamiUnlock } = useSound();
  const material = "inflatable";
  const labelStyle = "wild-plus";
  const entryMotion = "absurd";
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const scenes = useRef<(Scene | null)[]>([null, null, null]);
  const transition = useRef<{
    fadeToPortfolio: (
      overlay: HTMLElement,
      surface: HTMLElement,
      signal?: AbortSignal,
    ) => Promise<void>;
  } | null>(null);
  const controllers = useRef<(AbortController | null)[]>([null, null, null]);
  const alive = useRef(false);
  const [, setReadyCount] = useState(0);
  const busy = useRef(false);
  const entryAttempt = useRef(0);
  const restoring = useRef(false);
  const restoreFocus = useRef(false);
  const state = useRef(createKonamiState("keyboard"));
  const preview = useRef(false);
  const lastMove = useRef("");
  const activeRef = useRef(0);
  const animation = useRef<Animation | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressClickUntil = useRef(0);
  const origin = useRef<{ x: number; y: number; id: number; type: string; moved: boolean } | null>(
    null,
  );
  const [code, setCode] = useState(state.current);
  const [active, setActive] = useState(0);
  const [entering, setEntering] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const cancelEntry = useCallback(async () => {
    if (restoring.current || activeRef.current === 0) return;
    const scene = scenes.current[activeRef.current];
    if (!scene?.resetEntry) return;
    restoring.current = true;
    ++entryAttempt.current;
    stop();
    try {
      await scene.resetEntry();
      if (!alive.current) return;
      const card = cards.current[activeRef.current];
      if (card) delete card.dataset["entering"];
      busy.current = false;
      suppressClickUntil.current = 0;
      origin.current = null;
      restoreFocus.current = true;
      setEntering(false);
      setAnnouncement(`${destinations[activeRef.current]?.label} ready to enter.`);
    } finally {
      restoring.current = false;
    }
  }, [stop]);

  useEffect(() => {
    if (!entering && restoreFocus.current) {
      restoreFocus.current = false;
      cards.current[activeRef.current]
        ?.querySelector<HTMLButtonElement>("[data-computer-enter]")
        ?.focus({ preventScroll: true });
    }
  }, [entering]);

  const updateScreens = useCallback(() => {
    const input: InputScreen = {
      history: state.current.history,
      matched: state.current.prefix.length,
      total: state.current.mode === "touch" ? 8 : 10,
      variant: "spring",
      unlocked: state.current.unlocked,
      move: lastMove.current,
      preview: preview.current,
    };
    scenes.current.forEach((scene) => scene?.setInput?.(input));
  }, []);

  const disposeScenes = useCallback(() => {
    clearTimeout(previewTimer.current);
    animation.current?.cancel();
    animation.current = null;
    controllers.current.forEach((controller) => controller?.abort());
    controllers.current = [null, null, null];
    scenes.current.forEach((scene) => scene?.dispose());
    scenes.current = [null, null, null];
  }, []);

  const mount = useCallback(
    async (index: number) => {
      const card = cards.current[index];
      if (!card || controllers.current[index] || !alive.current || busy.current) return;
      const controller = new AbortController();
      controllers.current[index] = controller;
      const signal = controller.signal;
      if (index === 0) {
        const poster = card.querySelector<HTMLCanvasElement>(".computer-poster");
        if (poster)
          void import(/* @vite-ignore */ paths.material)
            .then((module) => {
              if (!signal.aborted) return module.drawComputerPoster(poster, signal);
            })
            .catch(() => {});
      }
      let instance: Scene | null = null;
      try {
        if (index !== 0) {
          const module: CanvasModule = await import(/* @vite-ignore */ paths.canvas);
          if (signal.aborted) return;
          instance = await module.mountCanvasComputer(card, signal, { material, entryMotion });
        } else {
          const module: SceneModule = await import(/* @vite-ignore */ paths.computer);
          if (signal.aborted) return;
          instance = await module.mountComputer(card, signal);
        }
      } catch {
        if (!signal.aborted) {
          try {
            const module: CanvasModule = await import(/* @vite-ignore */ paths.canvas);
            if (!signal.aborted)
              instance = await module.mountCanvasComputer(card, signal, { material, entryMotion });
          } catch {
            if (!signal.aborted) card.dataset["fallback"] = "true";
          }
        }
      }
      if (!instance) return;
      // Retain a neighboring machine that finishes loading during entry so
      // cancelling leaves it prepared instead of stranding its controller.
      if (signal.aborted || !alive.current) instance.dispose();
      else {
        scenes.current[index] = instance;
        instance.setActive?.(index === activeRef.current);
        updateScreens();
        setReadyCount((count) => count + 1);
      }
    },
    [updateScreens, material, entryMotion],
  );

  const select = useCallback(
    (index: number, focus = false) => {
      if (busy.current || !state.current.unlocked) return;
      const next = Math.max(0, Math.min(destinations.length - 1, index));
      activeRef.current = next;
      setActive(next);
      scenes.current.forEach((scene, index) => scene?.setActive?.(index === next));
      preview.current = true;
      clearTimeout(previewTimer.current);
      updateScreens();
      if (focus)
        cards.current[next]
          ?.querySelector<HTMLButtonElement>("[data-computer-enter]")
          ?.focus({ preventScroll: true });
    },
    [updateScreens],
  );

  const input = useCallback(
    (symbol: string, mode: KonamiMode) => {
      if (busy.current || state.current.unlocked) return;
      const next = advanceKonami(state.current, symbol, mode);
      state.current = next;
      setCode(next);
      const motion = softSpringMotion(symbol, next.prefix.length);
      lastMove.current = motion.label;
      animation.current?.cancel();
      animation.current = null;
      if (!reduced)
        animation.current =
          cards.current[0]
            ?.querySelector<HTMLElement>(".secret-computer-rig")
            ?.animate(motion.frames, { duration: motion.duration, easing: motion.easing }) ?? null;
      if (next.unlocked) {
        konamiUnlock();
        clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(() => {
          if (alive.current) {
            preview.current = true;
            updateScreens();
          }
        }, 650);
      } else konamiFeedback(symbol, next.prefix.length > 0, motion.duration);
      updateScreens();
      setAnnouncement(
        next.unlocked
          ? "Secret unlocked. Three computers available."
          : `${symbol}. ${next.prefix.length} of ${mode === "touch" ? 8 : 10} matched.`,
      );
    },
    [reduced, konamiFeedback, konamiUnlock, updateScreens],
  );

  const enter = useCallback(
    async (index = activeRef.current, skip = false) => {
      if (busy.current || !alive.current || (!state.current.unlocked && index !== 0)) return;
      if (!skip && !scenes.current[index]) {
        setAnnouncement("The computer is still loading. Skip intro is available.");
        return;
      }
      busy.current = true;
      const attempt = ++entryAttempt.current;
      if (index !== 0) {
        dialog.current?.focus({ preventScroll: true });
        setAnnouncement(`Entering ${destinations[index]?.label}. Press Escape to return.`);
      }
      setEntering(true);
      clearTimeout(previewTimer.current);
      animation.current?.cancel();
      animation.current = null;
      preview.current = true;
      updateScreens();
      if (skip) stop();
      else play("computer-click");
      const card = cards.current[index];
      if (card) card.dataset["entering"] = "true";
      try {
        if (!skip && (!reduced || index !== 0)) {
          const scene = scenes.current[index];
          if (scene && surface.current) await scene.enter(surface.current);
          else if (index === 0 && dialog.current && surface.current) {
            if (alive.current && transition.current)
              await transition.current.fadeToPortfolio(
                dialog.current,
                surface.current,
                controllers.current[0]?.signal,
              );
          }
        }
      } catch (error) {
        if (!alive.current || (error instanceof DOMException && error.name === "AbortError"))
          return;
        if (index !== 0) {
          await cancelEntry();
          if (alive.current)
            setAnnouncement("The transition was interrupted. The computer is ready to try again.");
          return;
        }
      }
      if (!alive.current || attempt !== entryAttempt.current) return;
      const destination = destinations[index];
      if (index === 0 || skip) onComplete();
      else if (destination?.url) window.location.assign(destination.url);
    },
    [onComplete, play, stop, reduced, surface, updateScreens, cancelEntry],
  );

  useEffect(() => {
    if (!document.documentElement.classList.contains("computer-entry")) return;
    alive.current = true;
    dialog.current?.focus({ preventScroll: true });
    const card = cards.current[0];
    const screenOn = () => {
      if (!busy.current) play("power");
    };
    card?.addEventListener("computer-screen-on", screenOn);
    const hidden = () => {
      if (document.hidden) {
        animation.current?.cancel();
        animation.current = null;
        stop();
      }
    };
    const pagehide = () => {
      stop();
      disposeScenes();
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) onComplete();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    void import(/* @vite-ignore */ paths.transition)
      .then((module) => {
        if (alive.current) transition.current = module;
      })
      .catch(() => {});
    void mount(0);
    return () => {
      alive.current = false;
      card?.removeEventListener("computer-screen-on", screenOn);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      disposeScenes();
      stop();
    };
  }, [mount, disposeScenes, onComplete, play, stop]);
  useEffect(() => {
    if (code.unlocked) {
      void mount(1);
      void mount(2);
    }
  }, [code.unlocked, mount]);

  return (
    <section
      ref={dialog}
      className="portfolio-computer secret-computer-deck"
      data-label-style={labelStyle}
      data-entry-motion={entryMotion}
      data-external-entry={entering && active !== 0}
      data-unlocked={code.unlocked}
      data-entering={entering}
      role="dialog"
      tabIndex={-1}
      aria-modal="true"
      aria-label={code.unlocked ? "Choose a computer" : "Enter Matt’s portfolio"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (busy.current && activeRef.current !== 0) void cancelEntry();
          else void enter(0, true);
          return;
        }
        if (event.key === "Tab") {
          if (busy.current && activeRef.current !== 0) {
            event.preventDefault();
            return;
          }
          const buttons = [
            ...(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ??
              []),
          ].filter(
            (button) =>
              button.tabIndex >= 0 &&
              !button.closest("[inert]") &&
              button.getClientRects().length > 0,
          );
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
          return;
        }
        if (code.unlocked) {
          if (
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight")
          ) {
            event.preventDefault();
            select(activeRef.current + (event.key === "ArrowRight" ? 1 : -1), true);
          }
          return;
        }
        const symbol = keyboardSymbol(event);
        if (symbol) {
          event.preventDefault();
          input(symbol, "keyboard");
        }
      }}
      onPointerDown={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest(".secret-computer-card"))
          return;
        // Suppress only the click from the drag that just ended. A new
        // physical press is a fresh intention, including an immediate tap.
        if (activeRef.current !== 0) suppressClickUntil.current = 0;
        origin.current = {
          x: event.clientX,
          y: event.clientY,
          id: event.pointerId,
          type: event.pointerType,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const start = origin.current;
        if (
          start &&
          event.pointerId === start.id &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12
        ) {
          start.moved = true;
          suppressClickUntil.current = performance.now() + 800;
        }
      }}
      onPointerUp={(event) => {
        const start = origin.current;
        if (!start || start.id !== event.pointerId) return;
        origin.current = null;
        if (start.moved) suppressClickUntil.current = performance.now() + 800;
        if (start.type !== "touch" && start.type !== "pen") return;
        const symbol = swipeSymbol(event.clientX - start.x, event.clientY - start.y);
        if (!symbol) return;
        event.preventDefault();
        suppressClickUntil.current = performance.now() + 800;
        if (state.current.unlocked) {
          if (symbol === "←" || symbol === "→")
            select(activeRef.current + (symbol === "←" ? 1 : -1));
        } else input(symbol, "touch");
      }}
      onPointerCancel={() => {
        origin.current = null;
        suppressClickUntil.current = performance.now() + 800;
      }}
      onClickCapture={(event) => {
        if (
          performance.now() < suppressClickUntil.current &&
          event.target instanceof Element &&
          event.target.closest(".secret-computer-card")
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div
        className="secret-computer-track"
        style={{ "--active-computer": active } as CSSProperties}
      >
        {destinations.map((destination, index) => (
          <article
            key={destination.kind}
            ref={(element) => {
              cards.current[index] = element;
            }}
            className={`secret-computer-card${index === active ? " active" : ""}`}
            data-computer-entrance
            data-kind={destination.kind}
            data-case-baked={destination.kind === "references" ? "true" : undefined}
            inert={!code.unlocked && index !== 0}
            onClick={(event) => {
              if (!(event.target instanceof Element) || event.target.closest("button")) return;
              if (code.unlocked && index !== activeRef.current) select(index);
            }}
          >
            <div className="secret-computer-rig">
              <canvas className="computer-poster" width="1024" height="1024" aria-hidden="true" />
              <div className="computer-stage" data-computer-stage aria-hidden="true" />
              <button
                className="computer-screen-hit"
                data-computer-enter
                tabIndex={index === active ? 0 : -1}
                disabled={entering || !scenes.current[index]}
                aria-label={`${code.unlocked && index !== active ? "Select" : "Enter"} ${destination.label}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => {
                  if (code.unlocked && index !== activeRef.current) select(index);
                  else void enter(index);
                }}
              />
            </div>
            <div className="secret-computer-label">
              <span>0{index + 1}</span>
              <h2 aria-label={destination.label}>
                {labelStyle === "wild-plus" ? (
                  <span className="computer-label-word" aria-hidden="true">
                    {[...destination.label].map((letter, i) => (
                      <span className="computer-label-glyph" data-glyph={letter} key={i}>
                        {letter}
                      </span>
                    ))}
                  </span>
                ) : (
                  destination.label
                )}
              </h2>
              <p>{destination.domain}</p>
              <small>{destination.detail}</small>
            </div>
          </article>
        ))}
      </div>
      {code.unlocked && (
        <nav className="secret-computer-browse" aria-label="Secret computers">
          <button disabled={entering || active === 0} onClick={() => select(activeRef.current - 1)}>
            Previous
          </button>
          <span aria-live="polite">0{active + 1} / 03</span>
          <button disabled={entering || active === 2} onClick={() => select(activeRef.current + 1)}>
            Next
          </button>
        </nav>
      )}
      <button className="computer-skip" disabled={entering} onClick={() => void enter(0, true)}>
        Skip intro
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
