import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import {
  applyFactoryEggPose,
  mountFactoryEggMotion,
  SCOUT_DEFLATION_FRAMES,
} from "../src/lib/factory-egg-motion";
import { createFactoryEggController, FACTORY_EGG_DURATION } from "../src/lib/factory-eggs";

class ElementStub {
  className = "";
  dataset: Record<string, string> = {};
  attrs: Record<string, string> = {};
  properties = new Map<string, string>();
  style = { setProperty: (name: string, value: string) => this.properties.set(name, value) };
  children: ElementStub[] = [];
  parent: ElementStub | null = null;
  ownerDocument = { createElement: () => new ElementStub() };
  animations: {
    frames: Keyframe[];
    options: KeyframeAnimationOptions;
    canceled: boolean;
    cancel: () => void;
  }[] = [];
  querySelector(selector: string): ElementStub | null {
    return this.children.find((child) => child.className === selector.slice(1)) ?? null;
  }
  append(child: ElementStub) {
    child.parent = this;
    this.children.push(child);
  }
  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }
  removeAttribute(name: string) {
    delete this.attrs[name];
    if (name === "data-egg-squash") delete this.dataset["eggSquash"];
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  animate(frames: Keyframe[], options: KeyframeAnimationOptions) {
    const animation = {
      frames,
      options,
      canceled: false,
      cancel() {
        this.canceled = true;
      },
    };
    this.animations.push(animation);
    return animation;
  }
}
function fixture() {
  const root = new ElementStub(),
    rig = new ElementStub(),
    stage = new ElementStub(),
    spotlights = new ElementStub();
  stage.className = "computer-stage";
  spotlights.className = "factory-spotlights";
  rig.append(stage);
  root.append(rig);
  root.append(spotlights);
  const show = (egg: "sonar" | "valve", reduced = false, echoReady = true) =>
    mountFactoryEggMotion({
      egg,
      reduced,
      echoReady,
      root: root as unknown as HTMLElement,
      rig: rig as unknown as HTMLElement,
    });
  return { root, rig, stage, spotlights, show };
}
function decoration(rig: ElementStub) {
  return rig.children.find((child) => child.className.startsWith("factory-egg-decoration"))!;
}
const css = readFileSync(new URL("../src/components/factory-eggs.css", import.meta.url), "utf8");

describe("registered physical egg effects", () => {
  it("anchors the air/pulse, extent and feet to the exact painted frame and size", () => {
    const rig = new ElementStub();
    applyFactoryEggPose(
      rig as unknown as HTMLElement,
      { x: 120, y: 80, size: 400, frame: "2-18" },
      [0.8352296, 0.3281133, 0.0518172, 0.0755336],
    );
    expect(rig.properties.get("--egg-control-x")).toBe(`${120 + 400 * 0.8352296}px`);
    expect(rig.properties.get("--egg-control-y")).toBe(`${80 + 400 * 0.3281133}px`);
    expect(rig.properties.get("--egg-control-width")).toBe(`${400 * 0.0518172}px`);
    expect(rig.properties.get("--egg-control-height")).toBe(`${400 * 0.0755336}px`);
    expect(rig.properties.get("--egg-foot-x")).toBe("320px");
    expect(rig.properties.get("--egg-foot-y")).toBe("430px");
    applyFactoryEggPose(
      rig as unknown as HTMLElement,
      { x: 60, y: 40, size: 200, frame: "1-9" },
      [0.8600485, 0.3261571, 0.0629976, 0.0749618],
    );
    expect(rig.properties.get("--egg-control-x")).toBe(`${60 + 200 * 0.8600485}px`);
    expect(rig.properties.get("--egg-foot-y")).toBe("215px");
    expect(rig.properties.size).toBe(9);
  });

  it("visibly deflates the whole rig by 35%, then reinflates and settles at identity", () => {
    const f = fixture();
    const cancel = f.show("valve");
    expect(f.rig.animations).toHaveLength(1);
    expect(f.rig.animations[0]!.frames).toBe(SCOUT_DEFLATION_FRAMES);
    expect(f.rig.animations[0]!.options.duration).toBe(2600);
    expect(SCOUT_DEFLATION_FRAMES[3]!.transform).toContain("0.65");
    expect(SCOUT_DEFLATION_FRAMES.at(-1)!.transform).toBe("none");
    expect(
      SCOUT_DEFLATION_FRAMES.every((frame) => !/rotate|skew/.test(String(frame.transform))),
    ).toBe(true);
    expect(f.stage.animations).toHaveLength(0);
    expect(f.rig.dataset["eggSquash"]).toBe("true");
    const air = decoration(f.rig);
    expect(air.children.filter((node) => node.className === "factory-egg-air-puff")).toHaveLength(
      9,
    );
    expect(air.children.filter((node) => node.className === "factory-egg-air-stream")).toHaveLength(
      3,
    );
    expect(air.attrs["aria-hidden"]).toBe("true");
    cancel();
    expect(f.rig.animations.every((animation) => animation.canceled)).toBe(true);
    expect(f.rig.dataset["eggSquash"]).toBeUndefined();
    expect(f.rig.children).toEqual([f.stage]);
  });

  it("sends three scene waves, knob flash, scan and Tidal-field response without needing a sprite", () => {
    const f = fixture();
    const cancel = f.show("sonar", false, false);
    const sonar = decoration(f.rig);
    expect(sonar.children.map((node) => node.className)).toEqual([
      "factory-egg-sonar-wave",
      "factory-egg-sonar-wave",
      "factory-egg-sonar-wave",
      "factory-egg-sonar-source",
      "factory-egg-sonar-scan",
      "factory-egg-sonar-field",
    ]);
    expect(f.rig.animations).toHaveLength(0);
    expect(f.stage.animations).toHaveLength(1);
    expect(f.spotlights.animations).toHaveLength(1);
    expect(f.stage.animations[0]!.options.duration).toBe(2900);
    expect(f.stage.animations[0]!.frames.at(-1)!.filter).toBe("brightness(1) saturate(1)");
    cancel();
    cancel();
    expect(f.stage.animations.every((animation) => animation.canceled)).toBe(true);
    expect(f.spotlights.animations.every((animation) => animation.canceled)).toBe(true);
    expect(f.rig.children).toEqual([f.stage]);
  });

  it("adds a brief, aria-hidden echo only after the sprite has decoded", () => {
    const f = fixture();
    const cancel = f.show("sonar");
    expect(
      decoration(f.rig).children.filter((node) => node.className === "factory-egg-sonar-echo"),
    ).toHaveLength(1);
    expect(css).toContain("egg-sonar-echo 1400ms ease-in-out 1100ms both");
    cancel();
  });

  for (const egg of ["sonar", "valve"] as const) {
    it(`${egg} reduced motion uses static light/air marks with no rig, stage or light animation`, () => {
      const f = fixture();
      const cancel = f.show(egg, true);
      expect(decoration(f.rig).dataset["reduced"]).toBe("true");
      expect([...f.rig.animations, ...f.stage.animations, ...f.spotlights.animations]).toHaveLength(
        0,
      );
      expect(f.rig.dataset["eggSquash"]).not.toBe("true");
      expect(css).toContain('.factory-egg-decoration[data-reduced="true"] *');
      cancel();
      expect(f.rig.children).toEqual([f.stage]);
    });

    it(`${egg} replacement, Escape, hidden reset, expiration and unmount synchronously cancel owned motion`, () => {
      const f = fixture();
      let current: (() => void) | undefined;
      let visible = true;
      let id = 0;
      const timers = new Map<number, { fn: () => void; ms: number }>();
      const controller = createFactoryEggController({
        environment: () => ({
          expanded: true,
          settled: true,
          visible,
          blocked: false,
          pointerDown: false,
          reducedMotion: false,
          machine: egg === "sonar" ? "anduril" : "scout",
        }),
        show: () => {
          current = f.show(egg);
        },
        clear: () => {
          current?.();
          current = undefined;
        },
        sound: () => {},
        now: () => 0,
        schedule: (fn, ms) => {
          timers.set(++id, { fn, ms });
          return id as unknown as ReturnType<typeof setTimeout>;
        },
        unschedule: (timer) => {
          timers.delete(timer as unknown as number);
        },
      });
      for (const outcome of ["replace", "escape", "hidden", "expire", "dispose"]) {
        expect(controller.activate(egg, true)).toBe(true);
        const previous = decoration(f.rig);
        if (outcome === "replace") {
          expect(controller.activate(egg, true)).toBe(true);
          expect(decoration(f.rig)).not.toBe(previous);
          expect(previous.parent).toBeNull();
          controller.cancel();
        } else if (outcome === "escape")
          controller.key({
            key: "Escape",
            repeat: false,
            isComposing: false,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            defaultPrevented: false,
          });
        else if (outcome === "hidden") {
          visible = false;
          controller.reset();
          visible = true;
        } else if (outcome === "expire")
          [...timers.values()].find((timer) => timer.ms === FACTORY_EGG_DURATION[egg])!.fn();
        else controller.dispose();
        expect(f.rig.children).toEqual([f.stage]);
        expect(f.rig.dataset["eggSquash"]).toBeUndefined();
        expect(
          [...f.rig.animations, ...f.stage.animations, ...f.spotlights.animations].every(
            (animation) => animation.canceled,
          ),
        ).toBe(true);
      }
      expect(controller.activate(egg)).toBe(false);
    });
  }

  it("has no old Scout text card or standalone jellyfish payoff, and keeps new art noninteractive", () => {
    const component = readFileSync(
      new URL("../src/components/factory-eggs.tsx", import.meta.url),
      "utf8",
    );
    expect(component).not.toContain('"pffft."');
    expect(component).not.toContain('"Pressure checked. All puff."');
    expect(css).not.toContain("@keyframes egg-valve");
    expect(css).toContain("pointer-events: none !important");
    expect(component).toContain('announcement.setAttribute("role", "status")');
    expect(component).toContain("clearMotion?.()");
    expect(component).toContain(
      '((egg === "sonar" || egg === "valve") && hotspotStatus !== "ready")',
    );
    expect(component).toContain('setHotspotStatus("error")');
    expect(component).toContain("if (rig) applyFactoryEggPose(rig, pose, point)");
  });
});
