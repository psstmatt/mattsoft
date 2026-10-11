import { FACTORY_EGG_DURATION } from "./factory-eggs";

export type PaintedEggPose = { x: number; y: number; size: number; frame: string };
export type EggControlPoint = [number, number, number, number];

/** The emitter, deformation pivot and native hit areas all share the painted frame. */
export function applyFactoryEggPose(
  rig: HTMLElement,
  pose: PaintedEggPose,
  point: EggControlPoint,
) {
  const values = {
    "pose-x": pose.x,
    "pose-y": pose.y,
    "pose-size": pose.size,
    "control-x": pose.x + pose.size * point[0],
    "control-y": pose.y + pose.size * point[1],
    "control-width": pose.size * point[2],
    "control-height": pose.size * point[3],
    "foot-x": pose.x + pose.size * 0.5,
    "foot-y": pose.y + pose.size * 0.875,
  };
  for (const [name, value] of Object.entries(values))
    rig.style.setProperty(`--egg-${name}`, `${value}px`);
}

/** Entire registered case, glass, CRT and both native hit regions sag as one object. */
export const SCOUT_DEFLATION_FRAMES: Keyframe[] = [
  { offset: 0, transform: "none" },
  { offset: 0.08, transform: "scale(1.018, 0.97)" },
  { offset: 0.34, transform: "scale(1.065, 0.66)" },
  { offset: 0.46, transform: "scale(1.07, 0.65)" },
  { offset: 0.76, transform: "scale(0.99, 1.025)" },
  { offset: 0.9, transform: "scale(1.008, 0.985)" },
  { offset: 1, transform: "none" },
];

/** Finite decorative effects only: no timers, audio, RAF, input capture or renderer writes. */
export function mountFactoryEggMotion({
  egg,
  rig,
  root,
  reduced,
  echoReady = false,
}: {
  egg: "sonar" | "valve";
  rig: HTMLElement;
  root: HTMLElement;
  reduced: boolean;
  echoReady?: boolean;
}) {
  const doc = rig.ownerDocument;
  const decoration = doc.createElement("div");
  decoration.className = `factory-egg-decoration factory-egg-${egg}`;
  decoration.dataset["reduced"] = String(reduced);
  decoration.setAttribute("aria-hidden", "true");
  const animations: Animation[] = [];
  const animate = (element: HTMLElement | null, frames: Keyframe[], duration: number) => {
    if (!reduced && element?.animate)
      animations.push(element.animate(frames, { duration, easing: "ease-in-out" }));
  };
  const add = (className: string) => {
    const node = doc.createElement("i");
    node.className = className;
    decoration.append(node);
    return node;
  };

  if (egg === "valve") {
    rig.dataset["eggSquash"] = String(!reduced);
    for (let i = 0; i < 9; i++) {
      const puff = add("factory-egg-air-puff");
      puff.style.setProperty("--puff-index", String(i));
      puff.style.setProperty("--puff-x", String(0.18 + (i % 3) * 0.045));
      puff.style.setProperty("--puff-y", String(-0.11 + (i % 5) * 0.036));
    }
    for (let i = 0; i < 3; i++) {
      const stream = add("factory-egg-air-stream");
      stream.style.setProperty("--stream-index", String(i));
    }
    animate(rig, SCOUT_DEFLATION_FRAMES, FACTORY_EGG_DURATION.valve);
  } else {
    for (let i = 0; i < 3; i++) {
      const pulse = add("factory-egg-sonar-wave");
      pulse.style.setProperty("--wave-index", String(i));
    }
    add("factory-egg-sonar-source");
    add("factory-egg-sonar-scan");
    add("factory-egg-sonar-field");
    if (echoReady) {
      const echo = doc.createElement("img");
      echo.className = "factory-egg-sonar-echo";
      echo.src = "/experience/eggs/sonar-jellyfish.webp";
      echo.alt = "";
      decoration.append(echo);
    }
    animate(
      rig.querySelector<HTMLElement>(".computer-stage"),
      [
        { offset: 0, filter: "brightness(1) saturate(1)" },
        { offset: 0.12, filter: "brightness(1.22) saturate(1.14)" },
        { offset: 0.34, filter: "brightness(1.06) saturate(1.04)" },
        { offset: 0.54, filter: "brightness(1.14) saturate(1.1)" },
        { offset: 1, filter: "brightness(1) saturate(1)" },
      ],
      FACTORY_EGG_DURATION.sonar,
    );
    animate(
      root.querySelector<HTMLElement>(".factory-spotlights"),
      [
        { offset: 0, filter: "brightness(1)" },
        { offset: 0.13, filter: "brightness(1.65)" },
        { offset: 0.48, filter: "brightness(1.1)" },
        { offset: 1, filter: "brightness(1)" },
      ],
      FACTORY_EGG_DURATION.sonar,
    );
  }
  rig.append(decoration);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    animations.forEach((animation) => animation.cancel());
    decoration.remove();
    rig.removeAttribute("data-egg-squash");
  };
}
