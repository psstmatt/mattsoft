import { useEffect, useRef, useState, type RefObject } from "react";
import { useSound } from "@/lib/sound";
import { activeEscapeLayer } from "@/lib/factory-escape";
import {
  applyFactoryEggPose,
  mountFactoryEggMotion,
  type PaintedEggPose,
} from "@/lib/factory-egg-motion";
import {
  createFactoryEggController,
  factoryEggTouchTap,
  openFactoryForReview,
  factoryEggMode,
  type FactoryEgg,
  type FactoryEggMode,
} from "@/lib/factory-eggs";
import "./factory-eggs.css";

const CONTROL =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [data-escape-local]';
const TARGETS = [
  { kind: "anduril", egg: "sonar", label: "Ping the Sonar knob" },
  { kind: "scout", egg: "valve", label: "Press Scout’s air valve" },
  {
    kind: "references",
    egg: "sticker",
    label: "Rub the holographic sticker. Tap, Space, or Enter to reveal",
  },
] as const;
const REVIEWS: { egg: FactoryEgg; label: string; index?: number }[] = [
  { egg: "sonar", label: "Sonar ping", index: 3 },
  { egg: "valve", label: "Air valve", index: 1 },
  { egg: "sticker", label: "Sticker secret", index: 2 },
  { egg: "lan", label: "LAN party" },
  { egg: "hotdog", label: "HOTDOG" },
];
type PaintedPose = PaintedEggPose;
type Hotspots = {
  controls: Record<string, { frames: Record<string, [number, number, number, number]> }>;
};

export function FactoryEggs({
  deck,
  expanded,
  entering,
  active,
  readyCount,
  onSelect,
  onOpen,
}: {
  deck: RefObject<HTMLElement | null>;
  expanded: boolean;
  entering: boolean;
  active: number;
  readyCount: number;
  onSelect: (index: number) => void;
  onOpen: () => void;
}) {
  const [mode, setMode] = useState<FactoryEggMode>("off");
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [readySprites, setReadySprites] = useState({ sonar: false, hotdog: false });
  const [hotspotStatus, setHotspotStatus] = useState<"loading" | "ready" | "error">("loading");
  const { factoryEggFeedback, stop } = useSound();
  const controls = useRef<{
    review: (egg: FactoryEgg, gesture: boolean) => void;
    reset: (visit?: boolean) => void;
  } | null>(null);
  const state = useRef({ expanded, entering, active, readyCount });
  state.current = { expanded, entering, active, readyCount };
  const select = useRef(onSelect);
  select.current = onSelect;
  const previousExpanded = useRef(expanded);
  useEffect(() => {
    setMode(factoryEggMode(location.search, location.hostname));
  }, []);
  useEffect(() => {
    if (mode === "off" || !expanded || !deck.current) return;
    const root = deck.current;
    const abort = new AbortController();
    const options = { signal: abort.signal };
    const cards = [...root.querySelectorAll<HTMLElement>(".secret-computer-card")];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const pointers = new Set<number>();
    let composing = false;
    let settledAt = performance.now() + 650;
    let hotspots: Hotspots | null = null;
    let disposed = false;
    let eggSound = false;
    let pendingReview: FactoryEgg | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let decoration: HTMLElement | null = null;
    let clearMotion: (() => void) | null = null;
    const announcement = document.createElement("span");
    announcement.className = "factory-egg-announcement";
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    root.append(announcement);
    const poses = new Map<HTMLElement, PaintedPose>();
    const buttons: HTMLButtonElement[] = [];
    const decodedSprites = new Set<FactoryEgg>();
    const sprites = (
      [
        ["sonar", "/experience/eggs/sonar-jellyfish.webp"],
        ["hotdog", "/experience/eggs/hotdog-technician.webp"],
      ] as const
    ).map(([egg, url]) => {
      const sprite = new Image();
      sprite.src = url;
      void sprite
        .decode()
        .then(() => {
          if (disposed) return;
          decodedSprites.add(egg);
          setReadySprites((ready) => ({ ...ready, [egg]: true }));
          const button = buttons.find((target) => target.dataset["eggHotspot"] === egg);
          if (button)
            button.disabled =
              !state.current.expanded ||
              state.current.entering ||
              button.closest(".secret-computer-card") !== cards[state.current.active];
        })
        .catch(() => {
          /* A missing optional echo is omitted; HOTDOG waits for its required sprite. */
        });
      return sprite;
    });
    const environment = () => {
      const current = state.current;
      const focused = document.activeElement;
      let blocked = composing || !!focused?.closest(CONTROL) || !!focused?.closest("form");
      let layers = [
        ...document.querySelectorAll(
          'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]',
        ),
      ];
      try {
        layers = [...layers, ...document.querySelectorAll(":popover-open")];
      } catch {
        /* Older browsers. */
      }
      blocked ||=
        !!document.fullscreenElement ||
        layers.some((layer) => layer !== root && activeEscapeLayer(layer, document));
      const currentCard = cards[current.active];
      return {
        expanded: current.expanded && !current.entering,
        settled: performance.now() >= settledAt && currentCard?.dataset["ready"] === "true",
        visible: !document.hidden && root.isConnected,
        blocked,
        pointerDown: pointers.size > 0,
        reducedMotion: reduced.matches,
        machine: currentCard?.dataset["kind"] ?? "",
      };
    };
    const clear = () => {
      clearMotion?.();
      clearMotion = null;
      decoration?.remove();
      decoration = null;
      announcement.textContent = "";
      root.removeAttribute("data-factory-egg");
      cards.forEach((card) =>
        card.querySelector(".secret-computer-rig")?.removeAttribute("data-egg-squash"),
      );
      if (eggSound) {
        eggSound = false;
        stop();
      }
    };
    const controller = createFactoryEggController({
      environment,
      canShow: (egg) => {
        if (egg === "hotdog") return decodedSprites.has(egg);
        if (egg !== "sonar" && egg !== "valve") return true;
        const card = cards[state.current.active];
        const pose = card && poses.get(card);
        return !!(pose && hotspots?.controls[card?.dataset["kind"] ?? ""]?.frames[pose.frame]);
      },
      clear,
      sound: (egg) => {
        eggSound = true;
        factoryEggFeedback(egg, true);
      },
      show: (egg, isReduced) => {
        root.dataset["factoryEgg"] = egg;
        if (egg === "sonar" || egg === "valve") {
          const rig =
            cards[state.current.active]?.querySelector<HTMLElement>(".secret-computer-rig");
          if (!rig) return;
          clearMotion = mountFactoryEggMotion({
            egg,
            rig,
            root,
            reduced: isReduced,
            echoReady: decodedSprites.has("sonar"),
          });
          announcement.textContent =
            egg === "sonar"
              ? "Sonar pulse sent. Echo detected."
              : isReduced
                ? "Scout air valve opened. Pressure released."
                : "Scout releases air, deflates, and reinflates.";
          return;
        }
        decoration = document.createElement("div");
        decoration.className = `factory-egg-decoration factory-egg-${egg}`;
        decoration.dataset["reduced"] = String(isReduced);
        decoration.setAttribute("aria-hidden", "true");
        if (egg === "hotdog") {
          const img = document.createElement("img");
          img.src = "/experience/eggs/hotdog-technician.webp";
          img.alt = "";
          const note = document.createElement("span");
          note.textContent = "Inspection complete. Needs mustard.";
          decoration.append(img, note);
        } else if (egg === "sticker") {
          decoration.textContent = "Still human. Still curious.";
        } else {
          for (let index = 0; index < 5; index++) decoration.append(document.createElement("i"));
          const note = document.createElement("span");
          note.textContent = "local friends · 4 online";
          decoration.append(note);
        }
        if (egg === "sticker")
          cards[state.current.active]?.querySelector(".secret-computer-rig")?.append(decoration);
        else root.append(decoration);
      },
    });
    function updateTarget(card: HTMLElement, button: HTMLButtonElement, pose: PaintedPose) {
      const kind = card.dataset["kind"] ?? "";
      const point = hotspots?.controls[kind]?.frames[pose.frame];
      button.hidden = !point;
      if (!point) return;
      const minimumClearSize = kind === "anduril" ? 211 : kind === "scout" ? 123 : 145;
      const safeTarget = (pose.size * 34) / minimumClearSize;
      const coarse = matchMedia("(pointer: coarse)").matches;
      Object.assign(button.style, {
        width: `${Math.min(coarse ? 44 : kind === "references" ? 42 : 34, safeTarget)}px`,
        height: `${Math.min(coarse ? 44 : kind === "references" ? 38 : 34, safeTarget)}px`,
        left: `${pose.x + pose.size * point[0]}px`,
        top: `${pose.y + pose.size * point[1]}px`,
      });
      const rig = card.querySelector<HTMLElement>(".secret-computer-rig");
      if (rig) applyFactoryEggPose(rig, pose, point);
    }
    for (const target of TARGETS) {
      const card = cards.find((card) => card.dataset["kind"] === target.kind);
      const rig = card?.querySelector(".secret-computer-rig");
      if (!card || !rig) continue;
      card.dataset["factoryEggs"] = "true";
      const button = document.createElement("button");
      button.type = "button";
      button.hidden = true;
      button.className = `factory-egg-hotspot factory-egg-hotspot-${target.egg}`;
      button.setAttribute("aria-label", target.label);
      button.title = target.label;
      button.dataset["eggHotspot"] = target.egg;
      let touchTap = false;
      let press: { x: number; y: number; type: string } | null = null;
      button.addEventListener(
        "pointerdown",
        (event) => {
          press = { x: event.clientX, y: event.clientY, type: event.pointerType };
          touchTap = false;
        },
        options,
      );
      button.addEventListener(
        "pointerup",
        (event) => {
          touchTap = factoryEggTouchTap(press, event);
          press = null;
        },
        options,
      );
      button.addEventListener(
        "pointercancel",
        () => {
          press = null;
          touchTap = false;
        },
        options,
      );
      button.addEventListener(
        "click",
        (event) => {
          if (target.egg === "sticker" && touchTap) controller.touchSticker();
          else controller.activate(target.egg, event.isTrusted);
          touchTap = false;
        },
        options,
      );
      if (target.egg === "sticker") {
        let lastX = 0,
          direction = 0,
          reversals = 0,
          distance = 0;
        button.addEventListener(
          "pointerenter",
          (event) => {
            lastX = event.clientX;
            direction = reversals = distance = 0;
          },
          options,
        );
        button.addEventListener(
          "pointermove",
          (event) => {
            // Mouse rubbing is local and never captures pointers. Touch keeps native tap/swipe.
            if (event.pointerType !== "mouse" || event.buttons !== 0) return;
            const delta = event.clientX - lastX;
            if (Math.abs(delta) < 3) return;
            const next = Math.sign(delta);
            if (direction && next !== direction) reversals++;
            direction = next;
            distance += Math.abs(delta);
            lastX = event.clientX;
            if (reversals >= 2 && distance >= 26) {
              controller.activate("sticker");
              direction = reversals = distance = 0;
            }
          },
          options,
        );
      }
      card.addEventListener(
        "computer-painted-pose",
        (event) => {
          const pose = (event as CustomEvent<PaintedPose>).detail;
          poses.set(card, pose);
          updateTarget(card, button, pose);
        },
        options,
      );
      rig.append(button);
      buttons.push(button);
      card.dispatchEvent(new Event("computer-request-pose"));
    }
    fetch("/experience/eggs/hotspots.json", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Hotspot map unavailable");
        return response.json() as Promise<Hotspots>;
      })
      .then((map) => {
        if (disposed) return;
        hotspots = map;
        setHotspotStatus("ready");
        buttons.forEach((button) => {
          const card = button.closest<HTMLElement>(".secret-computer-card");
          const pose = card && poses.get(card);
          if (card && pose) updateTarget(card, button, pose);
        });
      })
      .catch(() => {
        if (!disposed) setHotspotStatus("error");
      });
    const reset = (newVisit = false, preserveReview = false) => {
      if (!preserveReview) pendingReview = null;
      clearTimeout(settleTimer);
      settledAt = performance.now() + 650;
      controller.reset(newVisit);
      buttons.forEach((button) => {
        const current =
          button.closest<HTMLElement>(".secret-computer-card") === cards[state.current.active];
        button.disabled = !state.current.expanded || state.current.entering || !current;
        button.tabIndex = current && state.current.expanded && !state.current.entering ? 0 : -1;
      });
      settleTimer = setTimeout(() => {
        if (disposed) return;
        controller.activity();
        if (pendingReview) {
          const egg = pendingReview;
          pendingReview = null;
          controller.activate(egg);
        }
      }, 660);
    };
    controls.current = {
      reset: (visit) => reset(visit, true),
      review: (egg, gesture) => {
        pendingReview = null;
        const target = REVIEWS.find((item) => item.egg === egg);
        if (target?.index !== undefined && target.index !== state.current.active) {
          select.current(target.index);
          // Selection must settle first. Delayed demonstrations are deliberately silent.
          pendingReview = egg;
        } else if (!environment().settled) pendingReview = egg;
        else controller.activate(egg, gesture);
      },
    };
    const key = (event: KeyboardEvent) => {
      if (event.composedPath().some((node) => node instanceof Element && node.closest(CONTROL))) {
        controller.reset();
        return;
      }
      controller.key(event);
    };
    // Clear Escape in capture without claiming it; existing deck navigation still receives it.
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          pendingReview = null;
          controller.reset();
        }
        controller.activity();
      },
      { ...options, capture: true },
    );
    window.addEventListener("keydown", key, options);
    window.addEventListener(
      "pointerdown",
      (event) => {
        pointers.add(event.pointerId);
        controller.activity();
      },
      { ...options, capture: true },
    );
    for (const name of ["pointerup", "pointercancel"] as const)
      window.addEventListener(
        name,
        (event) => {
          pointers.delete(event.pointerId);
          controller.activity();
        },
        { ...options, capture: true },
      );
    for (const name of ["pointermove", "wheel", "scroll", "focusin", "input"] as const)
      window.addEventListener(name, () => controller.activity(), {
        ...options,
        capture: true,
        passive: true,
      });
    window.addEventListener(
      "compositionstart",
      () => {
        composing = true;
        controller.reset();
      },
      options,
    );
    window.addEventListener(
      "compositionend",
      () => {
        composing = false;
        controller.reset();
      },
      options,
    );
    const hide = () => {
      pointers.clear();
      controller.reset();
      pendingReview = null;
    };
    document.addEventListener("visibilitychange", hide, options);
    window.addEventListener("pagehide", hide, options);
    root.addEventListener("factory-egg-reset", () => reset(), options);
    reduced.addEventListener("change", () => reset(), options);
    reset();
    return () => {
      disposed = true;
      sprites.forEach((sprite) => sprite.removeAttribute("src"));
      abort.abort();
      controls.current = null;
      pendingReview = null;
      clearTimeout(settleTimer);
      controller.dispose();
      announcement.remove();
      buttons.forEach((button) => button.remove());
      cards.forEach((card) => {
        delete card.dataset["factoryEggs"];
      });
    };
  }, [mode, expanded, deck, factoryEggFeedback, stop]);
  useEffect(() => {
    controls.current?.reset(expanded && !previousExpanded.current);
    previousExpanded.current = expanded;
  }, [active, expanded, entering, readyCount]);
  if (mode !== "review") return null;
  return (
    <aside className="factory-egg-review" data-egg-review data-open={workbenchOpen}>
      <button
        className="factory-egg-review-toggle"
        aria-expanded={workbenchOpen}
        aria-controls="factory-egg-review-content"
        onClick={() => setWorkbenchOpen((open) => !open)}
      >
        Egg workbench
      </button>
      {workbenchOpen && (
        <div id="factory-egg-review-content">
          <p>Prototype only · same shipped factory</p>
          {!expanded ? (
            <button onClick={() => openFactoryForReview(mode, onOpen)}>
              Open factory for review
            </button>
          ) : (
            <>
              <div className="factory-egg-review-actions">
                {REVIEWS.map(({ egg, label }) => (
                  <button
                    key={egg}
                    disabled={
                      entering ||
                      (egg === "hotdog" && !readySprites[egg]) ||
                      ((egg === "sonar" || egg === "valve") && hotspotStatus !== "ready")
                    }
                    onClick={(event) => controls.current?.review(egg, event.nativeEvent.isTrusted)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {hotspotStatus !== "ready" && (
                <p role="status">
                  {hotspotStatus === "error"
                    ? "Valve and knob positions couldn’t load. Reload to try again."
                    : "Loading valve and knob positions…"}
                </p>
              )}
              <p>
                Try the knob, valve, sticker, or type HOTDOG. Five quick sticker taps summon HOTDOG
                on touch. LAN waits for 45 quiet seconds. Escape keeps its normal route.
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
