import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPortfolioSnapshotCompatible,
  hasComplexEntryTransform,
  runEntryTransition,
  ZOOM_MS,
} from "../public/experience/konami-transition.js";

function animationEnvironment() {
  let now = 0,
    id = 0;
  const frames = new Map(),
    timers = new Map(),
    windowEvents = new EventTarget(),
    orientation = Object.assign(new EventTarget(), { type: "portrait-primary", angle: 0 });
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { clientWidth: 393 },
  });
  const env = {
    document,
    innerWidth: 393,
    innerHeight: 664,
    screen: { orientation },
    performance: { now: () => now },
    requestAnimationFrame(callback) {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (key) => frames.delete(key),
    setTimeout(callback) {
      timers.set(++id, callback);
      return id;
    },
    clearTimeout: (key) => timers.delete(key),
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  };
  return {
    env,
    frames,
    timers,
    resize: () => windowEvents.dispatchEvent(new Event("resize")),
    rotate: () => windowEvents.dispatchEvent(new Event("orientationchange")),
    advance(value) {
      now = value;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(value));
    },
  };
}

describe("Safari entry viewport changes", () => {
  it("keeps intermediate zoom frames through repeated toolbar height changes", async () => {
    const a = animationEnvironment(),
      painted = [];
    let settled = false;
    const done = runEntryTransition({
      duration: ZOOM_MS,
      frame: (progress) => painted.push(progress),
      env: a.env,
    }).then(() => {
      settled = true;
    });
    for (const [time, height] of [
      [100, 744],
      [250, 844],
      [400, 664],
      [600, 744],
    ]) {
      a.advance(time);
      a.env.innerHeight = height;
      a.resize();
      await Promise.resolve();
      assert.equal(settled, false);
      assert.equal(painted.at(-1), time / ZOOM_MS);
      assert.equal(a.frames.size, 1);
    }
    a.advance(ZOOM_MS);
    await done;
    assert.equal(painted.at(-1), 1);
    assert.equal(painted.filter((progress) => progress === 1).length, 1);
    assert.equal(a.frames.size + a.timers.size, 0);
  });

  it("settles safely when width, layout width, or orientation changes", async () => {
    for (const reason of [
      "width",
      "layout",
      "orientation",
      "angle",
      "orientation-event",
      "legacy",
    ]) {
      const a = animationEnvironment(),
        painted = [];
      const done = runEntryTransition({
        duration: ZOOM_MS,
        frame: (progress) => painted.push(progress),
        env: a.env,
      });
      a.advance(100);
      if (reason === "width") a.env.innerWidth = 844;
      if (reason === "layout") a.env.document.documentElement.clientWidth = 378;
      if (reason === "orientation") a.env.screen.orientation.type = "landscape-primary";
      if (reason === "angle") a.env.screen.orientation.angle = 180;
      if (reason === "orientation-event")
        a.env.screen.orientation.dispatchEvent(new Event("change"));
      else if (reason === "legacy") a.rotate();
      else a.resize();
      await done;
      a.resize();
      a.rotate();
      a.advance(1000);
      assert.deepEqual(painted, [100 / ZOOM_MS, 1], reason);
      assert.equal(a.frames.size + a.timers.size, 0, reason);
    }
  });

  it("still settles on visibility loss or lost RAF after a toolbar resize", async () => {
    for (const reason of ["hidden", "timeout"]) {
      const a = animationEnvironment(),
        painted = [];
      const done = runEntryTransition({
        duration: ZOOM_MS,
        frame: (progress) => painted.push(progress),
        env: a.env,
      });
      a.advance(100);
      a.env.innerHeight = 844;
      a.resize();
      if (reason === "hidden") {
        a.env.document.hidden = true;
        a.env.document.dispatchEvent(new Event("visibilitychange"));
      } else [...a.timers.values()].forEach((callback) => callback());
      await done;
      a.advance(1000);
      assert.deepEqual(painted, [100 / ZOOM_MS, 1], reason);
      assert.equal(a.frames.size + a.timers.size, 0, reason);
    }
  });

  it("still rejects abort after a toolbar resize without painting the destination", async () => {
    const a = animationEnvironment(),
      controller = new AbortController(),
      painted = [];
    const done = runEntryTransition({
      duration: ZOOM_MS,
      frame: (progress) => painted.push(progress),
      signal: controller.signal,
      env: a.env,
    });
    a.advance(100);
    a.env.innerHeight = 844;
    a.resize();
    controller.abort();
    await assert.rejects(done, { name: "AbortError" });
    a.advance(1000);
    assert.deepEqual(painted, [100 / ZOOM_MS]);
    assert.equal(a.frames.size + a.timers.size, 0);
  });
});

describe("Safari compositor transforms", () => {
  function complex(transform, parentTransform = "none") {
    const body = {},
      parent = { parentElement: body, transform: parentTransform },
      canvas = { parentElement: parent, transform };
    return hasComplexEntryTransform(canvas, {
      document: { body },
      getComputedStyle: (node) => node,
    });
  }

  it("allows matrix3d translation and positive uniform XY scale", () => {
    for (const transform of [
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,-440,18,0,1)",
      "matrix3d(.75,0,0,0,0,.75,0,0,0,0,1,0,-440,18,0,1)",
      "matrix3d(1.5,0,0,0,0,1.5,0,0,0,0,1.5,0,50,-30,2,1)",
    ]) {
      assert.equal(complex(transform), false, transform);
      assert.equal(complex("none", transform), false, transform);
    }
  });

  it("rejects perspective, rotation, nonuniform or reflected scale, and malformed matrices", () => {
    for (const transform of [
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,-.002,0,0,0,1)",
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,-.0001,0,0,0,1)",
      "matrix3d(1,.2,0,0,-.2,1,0,0,0,0,1,0,0,0,0,1)",
      "matrix3d(1,0,0,0,0,.98,.2,0,0,-.2,.98,0,0,0,0,1)",
      "matrix3d(.8,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
      "matrix3d(.995,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
      "matrix3d(-1,0,0,0,0,-1,0,0,0,0,1,0,0,0,0,1)",
      "matrix3d(1,0,0,0)",
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,NaN,0,0,1)",
    ]) {
      assert.equal(complex(transform), true, transform);
      assert.equal(complex("none", transform), true, transform);
    }
  });
});

describe("Portfolio snapshot compatibility", () => {
  const capture = {
    viewportWidth: 393,
    viewportHeight: 664,
    themeDark: false,
    cssWidth: 393,
    naturalWidth: 786,
    naturalHeight: 4800,
  };

  it("accepts tall portrait captures across expanding and collapsing Safari toolbars", () => {
    for (const viewportHeight of [664, 744, 844])
      for (const height of [664, 744, 844])
        assert.equal(
          isPortfolioSnapshotCompatible(
            { ...capture, viewportHeight },
            { width: 393, height, themeDark: false },
          ),
          true,
        );
    assert.equal(
      isPortfolioSnapshotCompatible(
        { ...capture, cssWidth: 378, naturalWidth: 756 },
        { width: 393, height: 844, themeDark: false },
      ),
      true,
    );
  });

  it("rejects changed wrapping, theme, short captures, and invalid dimensions", () => {
    const viewport = { width: 393, height: 844, themeDark: false };
    for (const value of [
      { ...viewport, width: 844 },
      { ...viewport, themeDark: true },
      { ...viewport, height: 2402 },
      { ...viewport, height: 0 },
      { ...viewport, width: NaN },
    ])
      assert.equal(isPortfolioSnapshotCompatible(capture, value), false);
    for (const value of [
      null,
      { ...capture, naturalHeight: 1328 },
      { ...capture, naturalHeight: Infinity },
      { ...capture, naturalWidth: 0 },
      { ...capture, cssWidth: undefined },
    ])
      assert.equal(isPortfolioSnapshotCompatible(value, viewport), false);
  });

  it("accepts downscaled captures and ordinary canvas width/height metadata", () => {
    const viewport = { width: 393, height: 844, themeDark: false };
    assert.equal(
      isPortfolioSnapshotCompatible(
        { ...capture, naturalWidth: 393, naturalHeight: 844 },
        viewport,
      ),
      true,
    );
    assert.equal(
      isPortfolioSnapshotCompatible(
        { ...capture, naturalWidth: undefined, naturalHeight: undefined, width: 393, height: 844 },
        viewport,
      ),
      true,
    );
  });
});
