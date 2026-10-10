import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SONAR_ENTRY_MS,
  sonarEntryMotion,
  sonarEntryFrame,
  playCharacterEntry,
} from "../public/experience/sonar-entry.js";
import { affineTriangle } from "../public/experience/konami-page-projection.js";
import { previewSampleHeight } from "../public/experience/konami-screen-source.js";
import { sonarScreenGeometry } from "../public/experience/sonar-registration.js";

const shared = JSON.parse(
  readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url)),
);
const close = (a, b, epsilon = 1e-7) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const viewports = [
  { width: 320, height: 568 },
  { width: 393, height: 844 },
  { width: 1180, height: 757 },
  { width: 1920, height: 1080 },
];

function inputs(extra = {}) {
  return {
    meta: sonarScreenGeometry(shared),
    page: {
      width: 1440,
      height: 2800,
      naturalWidth: 1440,
      naturalHeight: 2800,
      cssWidth: 1440,
      getContext: () => ({ getImageData: () => ({ data: [13, 21, 30, 255] }) }),
    },
    pose: { x: -80, y: 72, s: 570 },
    viewport: { width: 393, height: 844 },
    width: 393,
    height: 664,
    scrollStart: 0.17,
    ...extra,
  };
}

function environment({ reduced = false, hidden = false } = {}) {
  let now = 0,
    id = 0,
    removed = false;
  const draws = [],
    fills = [],
    transforms = [],
    stack = [],
    frames = new Map(),
    timers = new Map(),
    listeners = new Map(),
    events = new EventTarget(),
    appended = [];
  const ctx = {
    draws,
    fills,
    transforms,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    save() {
      stack.push({
        globalAlpha: this.globalAlpha,
        globalCompositeOperation: this.globalCompositeOperation,
        fillStyle: this.fillStyle,
      });
    },
    restore() {
      Object.assign(this, stack.pop());
    },
    beginPath() {},
    closePath() {},
    clip() {},
    fill() {},
    moveTo() {},
    lineTo() {},
    setTransform(...args) {
      transforms.push(args);
    },
    transform(...args) {
      transforms.push(args);
    },
    clearRect() {
      draws.length = fills.length = transforms.length = 0;
    },
    fillRect(...args) {
      fills.push({ color: this.fillStyle, args });
    },
    drawImage(...args) {
      draws.push({ args, alpha: this.globalAlpha, operation: this.globalCompositeOperation });
    },
  };
  const canvas = {
      width: 786,
      height: 1328,
      style: {},
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 17, top: 31, width: 393, height: 664 }),
      remove() {
        removed = true;
      },
    },
    document = Object.assign(new EventTarget(), {
      hidden,
      documentElement: { clientWidth: 393, style: { scrollbarGutter: "stable" } },
      body: { append: (node) => appended.push(node) },
    }),
    env = {
      document,
      innerWidth: 393,
      innerHeight: 844,
      devicePixelRatio: 2,
      performance: { now: () => now },
      matchMedia: () => ({ matches: reduced }),
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
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(callback);
        events.addEventListener(type, callback);
      },
      removeEventListener(type, callback) {
        listeners.get(type)?.delete(callback);
        events.removeEventListener(type, callback);
      },
    };
  return {
    canvas,
    ctx,
    env,
    appended,
    frames,
    timers,
    listeners,
    get removed() {
      return removed;
    },
    resize: () => events.dispatchEvent(new Event("resize")),
    rotate: () => events.dispatchEvent(new Event("orientationchange")),
    advance(time) {
      now = time;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    },
  };
}

function runtime(a, args = inputs()) {
  return { ...args, canvas: a.canvas, body: {}, coverage: {}, glass: {}, env: a.env };
}

function assertEndpoint(a, page, width = a.env.innerWidth, height = a.env.innerHeight) {
  assert.equal(a.ctx.draws.length, 1);
  assert.deepEqual(a.ctx.draws[0].args, [page, 0, 0, width, (page.height * width) / page.width]);
  assert.deepEqual(a.ctx.fills, [{ color: "rgb(13,21,30)", args: [0, 0, width, height] }]);
  assert.equal(a.frames.size + a.timers.size, 0);
}

it("preserves the exact supplied screen mesh, camera pose, and scrolling source at the start", () => {
  const args = inputs(),
    { frame, cameraPose, motion } = sonarEntryFrame({ ...args, progress: 0 });
  assert.deepEqual(cameraPose, args.pose);
  args.meta.frame.screenMesh.forEach(([x, y], index) => {
    close(frame.mesh[index][0], args.pose.x + (x / args.meta.width) * args.pose.s);
    close(frame.mesh[index][1], args.pose.y + (y / args.meta.width) * args.pose.s);
  });
  assert.deepEqual(frame.sample, [
    0,
    args.scrollStart,
    1,
    previewSampleHeight(args.page, true, args.height),
  ]);
  assert.equal(motion.caseAlpha, 1);
  assert.equal(motion.glassAlpha, 0.16);
  assert.equal(frame.flat, false);
});

it("makes one restrained forward approach, with finite, unfolded triangles at each size", () => {
  assert.ok(SONAR_ENTRY_MS >= 850 && SONAR_ENTRY_MS <= 1000);
  for (const viewport of viewports) {
    const args = inputs({ viewport });
    let previous = sonarEntryMotion(0);
    for (let step = 0; step <= 100; step++) {
      const { frame, motion, cameraPose } = sonarEntryFrame({ ...args, progress: step / 100 });
      assert.ok(motion.camera >= previous.camera && motion.flatten >= previous.flatten);
      assert.ok(motion.caseAlpha <= previous.caseAlpha && motion.glassAlpha <= previous.glassAlpha);
      assert.ok(Object.values(cameraPose).every(Number.isFinite));
      assert.ok(frame.mesh.flat().every(Number.isFinite));
      for (const ids of args.meta.topology.triangles) {
        const matrix = affineTriangle(
          ids.map((index) => args.meta.topology.uv[index]),
          ids.map((index) => frame.mesh[index]),
        );
        assert.ok(matrix[0] * matrix[3] - matrix[1] * matrix[2] > 0);
      }
      previous = motion;
    }
  }
});

it("holds exactly one width-fitted source scale for its final 94ms on every viewport", () => {
  for (const viewport of viewports) {
    const args = inputs({ viewport });
    for (const progress of [0.9, 0.96, 1]) {
      const { frame, motion } = sonarEntryFrame({ ...args, progress });
      assert.equal(frame.flat, true);
      assert.equal(motion.caseAlpha + motion.glassAlpha, 0);
      assert.deepEqual(frame.sample.slice(0, 3), [0, 0, 1]);
      const sourcePoints = args.meta.topology.uv.map(([u, v]) => [
        u * args.page.width,
        v * frame.sample[3] * args.page.height,
      ]);
      for (const ids of args.meta.topology.triangles) {
        const matrix = affineTriangle(
          ids.map((index) => sourcePoints[index]),
          ids.map((index) => frame.mesh[index]),
        );
        matrix.forEach((value, index) =>
          close(
            value,
            [viewport.width / args.page.width, 0, 0, viewport.width / args.page.width, 0, 0][index],
          ),
        );
      }
    }
  }
});

it("promotes the displayed pose and draws directly from the high-resolution page throughout", async () => {
  const a = environment(),
    props = runtime(a),
    done = playCharacterEntry(props);
  assert.deepEqual(a.appended, [a.canvas]);
  assert.equal(a.env.document.documentElement.style.scrollbarGutter, "auto");
  assert.deepEqual(
    a.ctx.draws.slice(-3).map(({ args: [source], operation, alpha }) => [source, operation, alpha]),
    [
      [props.coverage, "destination-out", 1],
      [props.glass, "screen", 0.16],
      [props.body, "source-over", 1],
    ],
  );
  assert.deepEqual(a.ctx.draws.at(-1).args, [
    props.body,
    props.pose.x + 17,
    props.pose.y + 31,
    props.pose.s,
    props.pose.s,
  ]);
  for (const progress of [0.15, 0.4, 0.7, 0.85]) {
    a.advance(SONAR_ENTRY_MS * progress);
    const allowed = [props.page, props.body, props.coverage, props.glass];
    assert.ok(a.ctx.draws.some(({ args: [source] }) => source === props.page));
    assert.ok(a.ctx.draws.every(({ args: [source] }) => allowed.includes(source)));
    assert.ok(a.ctx.transforms.flat().every(Number.isFinite));
  }
  a.advance(SONAR_ENTRY_MS);
  await done;
  assertEndpoint(a, props.page);
  assert.equal(a.removed, false);
  assert.ok([...a.listeners.values()].every((listeners) => listeners.size === 0));
});

it("reduced motion and an already hidden app settle immediately to a clean capture", async () => {
  for (const options of [{ reduced: true }, { hidden: true }]) {
    const a = environment(options),
      props = runtime(a);
    await playCharacterEntry(props);
    assertEndpoint(a, props.page);
  }
});

it("hiding the app or changing orientation settles entry and clears its scheduled work", async () => {
  for (const interrupt of ["visibility", "orientation"]) {
    const a = environment(),
      props = runtime(a),
      done = playCharacterEntry(props);
    a.advance(250);
    if (interrupt === "visibility") {
      a.env.document.hidden = true;
      a.env.document.dispatchEvent(new Event("visibilitychange"));
    } else a.rotate();
    await done;
    assertEndpoint(a, props.page);
  }
});

it("refits changed widths immediately but lets mobile toolbar height changes finish naturally", async () => {
  for (const changeWidth of [true, false]) {
    const a = environment(),
      props = runtime(a),
      done = playCharacterEntry(props);
    a.advance(250);
    a.env.innerHeight = 932;
    if (changeWidth) {
      a.env.innerWidth = 430;
      a.env.document.documentElement.clientWidth = 430;
    }
    a.resize();
    if (!changeWidth) {
      assert.equal(a.frames.size, 1);
      a.advance(SONAR_ENTRY_MS);
    }
    await done;
    assertEndpoint(a, props.page);
    assert.equal(a.canvas.width, a.env.innerWidth * 2);
    assert.equal(a.canvas.height, 1864);
  }
});

it("covers the viewport beyond a reserved scrollbar gutter and releases held listeners when reset", async () => {
  const a = environment(),
    controller = new AbortController(),
    props = { ...runtime(a), signal: controller.signal },
    done = playCharacterEntry(props);
  a.advance(SONAR_ENTRY_MS);
  await done;
  assert.equal(a.listeners.get("resize").size, 1);
  assert.equal(a.listeners.get("orientationchange").size, 1);
  a.env.innerWidth = 1186;
  a.env.innerHeight = 760;
  a.env.document.documentElement.clientWidth = 1186;
  a.env.document.documentElement.getBoundingClientRect = () => ({ width: 1171 });
  a.env.devicePixelRatio = 1.5;
  a.resize();
  assertEndpoint(a, props.page, 1186, 760);
  assert.equal(a.canvas.width, Math.round(1186 * 1.5));
  assert.equal(a.canvas.style.width, "1186px");
  controller.abort();
  assert.equal(a.env.document.documentElement.style.scrollbarGutter, "stable");
  assert.ok([...a.listeners.values()].every((listeners) => listeners.size === 0));
  a.env.innerWidth = 640;
  a.resize();
  assert.equal(a.canvas.style.width, "1186px");
  assert.equal(a.removed, false);
});

it("abort removes the promoted canvas, cancels work, and never paints a destination", async () => {
  const a = environment(),
    controller = new AbortController(),
    done = playCharacterEntry({ ...runtime(a), signal: controller.signal });
  a.advance(250);
  const before = [...a.ctx.draws];
  controller.abort();
  await assert.rejects(done, { name: "AbortError" });
  a.advance(SONAR_ENTRY_MS);
  assert.deepEqual(a.ctx.draws, before);
  assert.equal(a.removed, true);
  assert.equal(a.frames.size + a.timers.size, 0);
  assert.ok([...a.listeners.values()].every((listeners) => listeners.size === 0));
});

it("an already aborted signal leaves the idle canvas untouched", async () => {
  const a = environment(),
    controller = new AbortController();
  controller.abort();
  await assert.rejects(playCharacterEntry({ ...runtime(a), signal: controller.signal }), {
    name: "AbortError",
  });
  assert.equal(a.appended.length, 0);
  assert.equal(a.removed, false);
  assert.equal(a.ctx.draws.length, 0);
});

it("paint failure removes the overlay and the lifecycle fallback can settle a stalled RAF", async () => {
  const failed = environment(),
    props = runtime(failed);
  failed.ctx.drawImage = () => {
    throw new Error("Paint failed");
  };
  await assert.rejects(playCharacterEntry(props), /Paint failed/);
  assert.equal(failed.removed, true);
  assert.equal(failed.frames.size + failed.timers.size, 0);
  const a = environment(),
    next = runtime(a),
    done = playCharacterEntry(next);
  for (const finish of [...a.timers.values()]) finish();
  await done;
  assertEndpoint(a, next.page);
});
