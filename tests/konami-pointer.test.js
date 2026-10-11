import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computerPointerTarget,
  pointerComputerPose,
  mountComputerPointer,
  pointInsidePolygon,
} from "../public/experience/konami-pointer.js";
import { mountCanvasComputer } from "../public/experience/konami-canvas-scene.js";
import { mountComputer } from "../public/experience/konami-computer-scene.js";
import { rendererEnvironment } from "./helpers/computer-renderer-environment.js";

const pose = { x: 100, y: 200, s: 400 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);

describe("computer pointer math and lifecycle", () => {
  it("bounds translation without changing scale, aspect, or internal registration", () => {
    const target = computerPointerTarget({ x: 100000, y: -100000 }, pose);
    assert.deepEqual(target, { x: 1, y: -1 });
    assert.deepEqual(computerPointerTarget({ x: 300, y: 400 }, pose), { x: 0, y: 0 });
    const moved = pointerComputerPose(pose, target);
    assert.equal(moved.s, pose.s);
    close(moved.x - pose.x, 7.2);
    close(moved.y - pose.y, -4.8);
    for (const [u, v] of [
      [0, 0],
      [0.23, 0.17],
      [0.8, 0.9],
    ]) {
      close(moved.x + u * moved.s - (pose.x + u * pose.s), 7.2);
      close(moved.y + v * moved.s - (pose.y + v * pose.s), -4.8);
    }
    assert.equal(
      pointInsidePolygon({ x: 4, y: 4 }, [
        [0, 0],
        [8, 0],
        [8, 8],
        [0, 8],
      ]),
      true,
    );
    assert.equal(
      pointInsidePolygon({ x: -1, y: 4 }, [
        [0, 0],
        [8, 0],
        [8, 8],
        [0, 8],
      ]),
      false,
    );
  });
  it("ignores touch, pen, coarse pointers and reduced motion; clears interrupted hover", () => {
    const test = rendererEnvironment();
    const controller = new AbortController();
    let active = true;
    const input = mountComputerPointer({
      element: test.element,
      canvas: { getBoundingClientRect: () => ({ left: 20, top: 40, width: 1200, height: 900 }) },
      stage: test.stage,
      getPose: () => pose,
      isAvailable: () => active,
      onChange() {},
      signal: controller.signal,
      env: test.env,
    });
    try {
      for (const type of ["touch", "pen"]) {
        test.move(450, 300, type);
        assert.deepEqual(input.target, { x: 0, y: 0 });
      }
      test.move(450, 300);
      assert.equal(input.hovered, true);
      const first = input.sample(16);
      assert.ok(first.x > 0 && first.x < input.target.x);
      test.element.dispatchEvent(new Event("pointerleave"));
      assert.equal(input.hovered, false);
      assert.ok(input.sample(32).x < first.x);
      test.move(450, 300);
      test.blur();
      assert.deepEqual(input.sample(48), { x: 0, y: 0 });
      test.move(450, 300);
      test.intersect(false);
      assert.equal(input.inView, false);
      assert.equal(input.settling, false);
      assert.deepEqual(input.sample(64), { x: 0, y: 0 });
      test.intersect(true);
      test.fineMedia.matches = false;
      test.fineMedia.dispatchEvent(new Event("change"));
      test.move(450, 300);
      assert.deepEqual(input.target, { x: 0, y: 0 });
      test.fineMedia.matches = true;
      test.reducedMedia.matches = true;
      test.move(450, 300);
      assert.equal(input.hovered, true); // Static spotlight feedback remains.
      assert.deepEqual(input.target, { x: 0, y: 0 });
      assert.deepEqual(input.sample(80), { x: 0, y: 0 });
      assert.equal(input.hovered, true);
      assert.equal(input.settling, false);
      test.reducedMedia.matches = false;
      active = false;
      test.move(450, 300);
      assert.deepEqual(input.target, { x: 0, y: 0 });
      active = true;
      test.move(450, 300);
      controller.abort();
      assert.equal(input.hovered, false);
      assert.equal(test.observers[0].disconnected, true);
      assert.equal(test.frames.size, 0); // Input never owns a second RAF loop.
    } finally {
      controller.abort();
    }
  });
});

describe("renderer pointer integration", () => {
  it("completes actual WebGL setup and binds hover callbacks instead of falling back", async () => {
    const test = rendererEnvironment();
    test.install();
    let scene;
    try {
      scene = await mountComputer(test.element, new AbortController().signal);
      test.advance(1000);
      assert.equal(test.element.dataset.renderMode, "webgl");
      assert.equal(test.element.dataset.ready, "true");
      const neutral = test.uniforms.get("uTube").slice();
      test.move(740, 370);
      assert.equal(test.element.dataset.computerHovered, "true");
      assert.equal(test.frames.size, 1);
      await Promise.resolve();
      test.advance(1050);
      // Let the asynchronous angle bank become available, then exercise the
      // actual projection, not merely a registered pointer event listener.
      for (let n = 0; n < 300; n++) await Promise.resolve();
      test.advance(1100);
      for (let n = 0; n < 50; n++) await Promise.resolve();
      test.advance(1150);
      assert.notDeepEqual(test.uniforms.get("uTube"), neutral);
      test.button.dispatchEvent(new Event("focus"));
      test.button.dispatchEvent(new Event("blur"));
      scene.setActive(false);
      assert.equal(test.frames.size, 0);
      assert.equal(test.element.dataset.computerHovered, "false");
      scene.setActive(true);
      test.advance(2000);
      assert.ok(test.uniforms.get("uTube").every(Number.isFinite));
      assert.ok(neutral.every(Number.isFinite));
      test.intersect(false);
      assert.equal(test.frames.size, 0);
      test.intersect(true);
      assert.equal(test.frames.size, 1);
    } finally {
      scene?.dispose();
      test.restore();
    }
  });
  for (const kind of ["scout", "anduril"]) {
    it(`moves ${kind}'s prepared composite and hit target together, with no idle or inactive RAF`, async () => {
      const test = rendererEnvironment({ kind });
      test.install();
      let scene;
      try {
        scene = await mountCanvasComputer(test.element, new AbortController().signal);
        const initial = scene.canvas.context.draws.at(-1).args.slice();
        const left = parseFloat(test.button.style.left),
          top = parseFloat(test.button.style.top);
        assert.equal(test.frames.size, 0);
        test.move(710, 390);
        assert.equal(test.element.dataset.computerHovered, "true");
        assert.equal(test.frames.size, 1);
        test.advance(16);
        const moved = scene.canvas.context.draws.at(-1).args;
        assert.notEqual(moved[0], initial[0]);
        close(parseFloat(test.button.style.left) - left, moved[0] - initial[0]);
        close(parseFloat(test.button.style.top) - top, moved[1] - initial[1]);
        assert.deepEqual(moved.slice(2), initial.slice(2));
        for (let now = 32; now < 2000; now += 16) test.advance(now);
        assert.equal(test.frames.size, 0);
        scene.setActive(false);
        assert.deepEqual(scene.canvas.context.draws.at(-1).args, initial);
        test.move(710, 390);
        assert.equal(test.frames.size, 0);
        scene.setActive(true);
        test.move(710, 390);
        test.advance(2100);
        test.blur();
        test.advance(2116);
        assert.deepEqual(scene.canvas.context.draws.at(-1).args, initial);
        assert.equal(test.frames.size, 0);
        test.move(710, 390);
        test.reducedMedia.matches = true;
        test.reducedMedia.dispatchEvent(new Event("change"));
        assert.deepEqual(scene.canvas.context.draws.at(-1).args, initial);
        assert.equal(test.frames.size, 0);
        test.move(710, 390);
        assert.equal(test.element.dataset.computerHovered, "true");
        assert.deepEqual(scene.canvas.context.draws.at(-1).args, initial);
        assert.equal(test.frames.size, 0);
      } finally {
        scene?.dispose();
        test.restore();
      }
    });
  }
  for (const kind of ["scout", "references", "anduril"]) {
    it(`starts ${kind}'s approved entry from the displayed pointer pose and resets replay`, async () => {
      const test = rendererEnvironment({ kind });
      test.install();
      let scene;
      try {
        scene = await mountCanvasComputer(test.element, new AbortController().signal, {
          entryMotion: "absurd",
        });
        test.move(710, 390);
        for (let now = 16; now <= 1600; now += 16) {
          test.advance(now);
          if (kind === "references") for (let n = 0; n < 20; n++) await Promise.resolve();
        }
        const displayedFrame = test.element.dataset.cameraFrame;
        if (kind === "references") assert.notEqual(displayedFrame, "1-9");
        const moved = scene.canvas.context.draws.at(-1).args.slice();
        const entry = scene.enter({ style: {} });
        if (kind === "references") {
          assert.equal(test.element.dataset.cameraFrame, displayedFrame);
          assert.equal(test.element.dataset.cameraRecentering, "true");
          for (let n = 0; n < 200; n++) await Promise.resolve();
          test.advance(1840);
          for (let n = 0; n < 50; n++) await Promise.resolve();
          assert.equal(test.element.dataset.cameraFrame, "1-9");
          assert.equal(test.element.dataset.cameraRecentering, "false");
        }
        const start =
          kind === "anduril"
            ? scene.canvas.context.draws.at(-1).args
            : (() => {
                const matrix = scene.canvas.context.transforms.at(-1);
                return [matrix[4], matrix[5], matrix[0], matrix[3]];
              })();
        close(start[0], moved[0] + 20);
        close(start[1], moved[1] + 40);
        close(start[2], moved[2]);
        close(start[3], moved[3]);
        assert.equal(test.element.dataset.computerHovered, "false");
        assert.equal(test.frames.size, 1); // The entry is the sole RAF owner.
        test.advance(3500);
        await entry;
        await scene.resetEntry();
        assert.equal(test.frames.size, 0);
        assert.equal(test.element.dataset.computerHovered, "false");
        const reset = scene.canvas.context.draws.at(-1).args;
        if (kind === "references") {
          assert.deepEqual(reset, moved);
          assert.equal(test.element.dataset.cameraFrame, "1-9");
        } else assert.notEqual(reset[0], moved[0]);
        test.move(710, 390);
        assert.equal(test.frames.size, 1);
      } finally {
        scene?.dispose();
        test.restore();
      }
    });
  }
});
