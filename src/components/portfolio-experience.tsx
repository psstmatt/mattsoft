import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { SecretComputerDeck } from "./secret-computer-deck";
import {
  FACTORY_HISTORY_KEY,
  FACTORY_STORAGE_KEY,
  FACTORY_SESSION_MS,
  factoryBrowserStorage,
  factoryEntryRoot,
  factoryHistoryState,
  factoryNavigationView,
  factorySessionFromHistory,
  factoryViewFromHistory,
  isFactorySnapshot,
  readFactorySession,
  saveFactorySession,
  type FactorySession,
  type FactorySnapshot,
  type FactoryView,
} from "../lib/factory-session";
import { listenForFactoryReturn } from "../lib/factory-escape";
import { RAINBOW_HOLD_MS, RAINBOW_FADE_MS, createRevealSchedule } from "../lib/experience-timing";

type RainbowModule = {
  mountHeroShader: (
    element: HTMLElement,
    definition: unknown,
    signal: AbortSignal,
    revealMs: number,
  ) => Promise<boolean>;
};

export const COMPUTER_BOOTSTRAP = `(function(){if(location.pathname!=='/'||new URLSearchParams(location.search).has('screen'))return;try{var m=history.state&&history.state[${JSON.stringify(FACTORY_HISTORY_KEY)}],s=JSON.parse(sessionStorage.getItem(${JSON.stringify(FACTORY_STORAGE_KEY)}));if(m&&s&&s.version===1&&m.id===s.id&&m.view!=='deck'&&Date.now()-s.createdAt>=0&&Date.now()-s.createdAt<${FACTORY_SESSION_MS})return;}catch(e){}var n=performance.getEntriesByType('navigation')[0];if(n&&n.type==='back_forward')return;document.documentElement.classList.add('computer-entry');})();`;

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
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [introOpen, setIntroOpen] = useState(pathname === "/");
  const [revealed, setRevealed] = useState(false);
  const [revealVisit, setRevealVisit] = useState(0);
  const [deckRevision, setDeckRevision] = useState(0);
  const [factorySession, setFactorySession] = useState<FactorySession | null>(null);
  const sessionRef = useRef<FactorySession | null>(null);
  const viewRef = useRef<FactoryView | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  const releaseSurface = useCallback(() => {
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
  }, []);

  const applyFactoryView = useCallback(
    (session: FactorySession, view: FactoryView) => {
      sessionRef.current = session;
      viewRef.current = view;
      setFactorySession(session);
      setIntroOpen(view === "deck");
      if (view === "deck") {
        document.documentElement.classList.remove("computer-handover");
        document.documentElement.classList.add("computer-entry");
        setRevealed(false);
      } else releaseSurface();
    },
    [releaseSurface],
  );

  const openFactoryView = useCallback(
    (view: FactoryView) => {
      const session = sessionRef.current;
      if (!session) return;
      saveFactorySession(factoryBrowserStorage(), session);
      applyFactoryView(session, view);
      router.history.push(session.rootHref, factoryHistoryState({}, session, view));
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [applyFactoryView, router],
  );

  const updateFactory = useCallback((snapshot: FactorySnapshot) => {
    if (!sessionRef.current || !isFactorySnapshot(snapshot)) return;
    const session = { ...sessionRef.current, snapshot: { ...snapshot } };
    sessionRef.current = session;
    setFactorySession(session);
    saveFactorySession(factoryBrowserStorage(), session);
  }, []);

  const returnToComputers = useCallback(() => {
    const session = sessionRef.current;
    if (!session || viewRef.current === "deck") return;
    // An earned factory is ready to browse again, including after a green-computer visit.
    updateFactory({ ...session.snapshot, expanded: session.snapshot.unlocked });
    openFactoryView("deck");
    window.dispatchEvent(new Event("resize"));
  }, [openFactoryView, updateFactory]);

  const recordExternalEntry = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    saveFactorySession(factoryBrowserStorage(), session);
    // Preserve the selected machine on the departing entry for normal Back
    // navigation. Destination-side Escape requires a separate integration.
    const location = router.history.location;
    router.history.replace(location.href, factoryHistoryState(location.state, session, "deck"));
  }, [router]);

  const finish = useCallback(() => {
    releaseSurface();
    if (sessionRef.current && viewRef.current === "deck") openFactoryView("portfolio");
    if (mounted.current) {
      setIntroOpen(false);
      setRevealed(true);
      setRevealVisit((visit) => visit + 1);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    const main = surface.current?.querySelector("main");
    if (main instanceof HTMLElement) {
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
    }
    window.dispatchEvent(new Event("resize"));
  }, [releaseSurface, openFactoryView]);

  useEffect(() => {
    const location = router.history.location;
    const stored = readFactorySession(factoryBrowserStorage());
    const savedView = factoryViewFromHistory(location.state, stored);
    const entryRoot = factoryEntryRoot(location.pathname, location.search);
    if (stored && savedView)
      applyFactoryView(factorySessionFromHistory(location.state, stored), savedView);
    else if (entryRoot) {
      const session: FactorySession = {
        version: 1,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        rootHref: entryRoot,
        snapshot: stored?.snapshot ?? { unlocked: false, active: 0, expanded: false },
      };
      saveFactorySession(factoryBrowserStorage(), session);
      applyFactoryView(session, "deck");
      router.history.replace(location.href, factoryHistoryState(location.state, session, "deck"));
    }

    return router.history.subscribe(({ location: next, action }) => {
      const session = sessionRef.current ?? readFactorySession(factoryBrowserStorage());
      const view = factoryNavigationView({
        state: next.state,
        session,
        currentView: viewRef.current,
        action: action.type,
        pathname: next.pathname,
      });
      if (session && view) {
        // Traversing between two deck entries in the same session must abort
        // any transition still owned by the departed history entry.
        if (view === "deck" && ["BACK", "FORWARD", "GO"].includes(action.type))
          setDeckRevision((revision) => revision + 1);
        const restored = factorySessionFromHistory(next.state, session);
        applyFactoryView(restored, view);
        if (!factoryViewFromHistory(next.state, session)) {
          router.history.replace(next.href, factoryHistoryState(next.state, restored, view));
        }
      } else if (sessionRef.current) {
        sessionRef.current = null;
        viewRef.current = null;
        setFactorySession(null);
        setIntroOpen(false);
        releaseSurface();
      }
    });
  }, [router, applyFactoryView, releaseSurface]);

  useEffect(() => {
    return listenForFactoryReturn({
      window,
      document,
      getVisit: () => {
        const session = sessionRef.current;
        const view = viewRef.current;
        if (!mounted.current || !session || !view || view === "deck") return null;
        const location = router.history.location;
        return `${session.id}:${view}:${location.state.__TSR_key ?? location.href}`;
      },
      onReturn: returnToComputers,
    });
  }, [router, returnToComputers]);

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
    if (pathname !== "/" && introOpen && !factorySession) finish();
  }, [pathname, introOpen, finish, factorySession]);
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
      {introOpen && (
        <SecretComputerDeck
          key={`${factorySession?.id ?? "initial"}:${deckRevision}`}
          surface={surface}
          onComplete={finish}
          {...(factorySession ? { restoredFactory: factorySession.snapshot } : {})}
          onFactoryChange={updateFactory}
          onExternalEntry={recordExternalEntry}
        />
      )}
      <div
        ref={surface}
        className="min-h-screen portfolio-surface"
        data-portfolio-surface
        id="top"
        tabIndex={-1}
      >
        <RainbowReveal key={revealVisit} active={revealed && pathname === "/"} />
        {children}
      </div>
    </>
  );
}
