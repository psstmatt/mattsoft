import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHARACTER_ENTRY_STYLES,
  CHARACTER_ENTRY_DURATIONS,
  characterEntryMotion,
  characterEntryFrame,
  characterEntryParticles,
  playCharacterEntry,
} from "../public/experience/konami-character-entry.js";
import {
  inflatableScreenGeometry,
  inflatablePose,
} from "../public/experience/inflatable-registration.js";
import { computerLayout } from "../public/experience/konami-layout.js";
import { affineTriangle } from "../public/experience/konami-page-projection.js";
import {
  previewSourceDimensions,
  previewSampleHeight,
} from "../public/experience/konami-screen-source.js";

const shared = JSON.parse(
  readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url)),
);
const close = (a, b, epsilon = 1e-7) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const kinds = ["scout", "references"];

function inputs(kind = "scout", style = "tactile", extra = {}) {
  const dimensions = kind === "scout" ? [1150, 228] : [1173, 2168],
    { width, height } = previewSourceDimensions(...dimensions),
    page = {
      width,
      height,
      naturalWidth: width,
      naturalHeight: height,
      cssWidth: dimensions[0],
      getContext: () => ({
        getImageData: () => ({ data: kind === "scout" ? [13, 12, 10, 255] : [247, 249, 250, 255] }),
      }),
    },
    layout = computerLayout(393, 664);
  return {
    meta: kind === "scout" ? inflatableScreenGeometry(shared) : shared,
    page,
    pose: kind === "scout" ? inflatablePose(layout) : layout,
    viewport: { width: 393, height: 844 },
    width: 393,
    height: 664,
    kind,
    style,
    scrollStart: kind === "references" ? 0.2 : 0,
    ...extra,
  };
}

function recorder() {
  const draws = [],
    fills = [],
    transforms = [],
    paths = [],
    stack = [];
  const ctx = {
    draws,
    fills,
    transforms,
    paths,
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
    stroke() {},
    fill() {},
    translate(...args) {
      transforms.push(args);
    },
    rotate(...args) {
      transforms.push(args);
    },
    setTransform(...args) {
      transforms.push(args);
    },
    transform(...args) {
      transforms.push(args);
    },
    moveTo(...args) {
      paths.push(args);
    },
    lineTo(...args) {
      paths.push(args);
    },
    quadraticCurveTo(...args) {
      paths.push(args);
    },
    ellipse(...args) {
      paths.push(args);
    },
    clearRect() {
      draws.length = 0;
      fills.length = 0;
      transforms.length = 0;
      paths.length = 0;
    },
    fillRect(...args) {
      fills.push({ color: this.fillStyle, alpha: this.globalAlpha, args });
    },
    drawImage(...args) {
      draws.push({ args, alpha: this.globalAlpha, operation: this.globalCompositeOperation });
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
  };
  return ctx;
}

function environment({ reduced = false } = {}) {
  let now = 0,
    nextId = 0,
    removed = false;
  const frames = new Map(),
    timers = new Map(),
    windowEvents = new EventTarget(),
    ctx = recorder(),
    canvas = {
      width: 786,
      height: 1328,
      style: {},
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 17, top: 31, width: 393, height: 664 }),
      remove() {
        removed = true;
      },
    },
    appended = [],
    document = Object.assign(new EventTarget(), {
      hidden: false,
      documentElement: { clientWidth: 393 },
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
        frames.set(++nextId, callback);
        return nextId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
      setTimeout(callback) {
        timers.set(++nextId, callback);
        return nextId;
      },
      clearTimeout: (id) => timers.delete(id),
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    };
  return {
    env,
    ctx,
    canvas,
    appended,
    frames,
    timers,
    get removed() {
      return removed;
    },
    resize: () => windowEvents.dispatchEvent(new Event("resize")),
    advance(time) {
      now = time;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    },
  };
}

function runtime(a, args) {
  return {
    ...args,
    canvas: a.canvas,
    body: { naturalWidth: 1024 },
    coverage: {},
    glass: {},
    env: a.env,
  };
}

for (const kind of kinds) {
  for (const style of CHARACTER_ENTRY_STYLES) {
    describe(`${kind} ${style} character entry`, () => {
      it("starts at the measured displayed aperture and preserves its source scroll", () => {
        const args = inputs(kind, style),
          { frame, motion, matrix } = characterEntryFrame({ ...args, progress: 0 });
        args.meta.frame.screenMesh.forEach(([x, y], i) => {
          close(frame.mesh[i][0], args.pose.x + (x / args.meta.width) * args.pose.s);
          close(frame.mesh[i][1], args.pose.y + (y / args.meta.width) * args.pose.s);
        });
        assert.deepEqual(frame.sample, [
          0,
          args.scrollStart,
          1,
          previewSampleHeight(args.page, true, args.height),
        ]);
        close(matrix[0], args.pose.s);
        close(matrix[3], args.pose.s);
        close(matrix[4], args.pose.x);
        close(matrix[5], args.pose.y);
        assert.equal(motion.caseAlpha, 1);
        close(motion.glassAlpha, 0.16);
        assert.equal(frame.flat, false);
      });

      it("reaches one exact width-fitted source scale on every viewport", () => {
        for (const viewport of [
          { width: 320, height: 568 },
          { width: 393, height: 844 },
          { width: 1180, height: 757 },
        ]) {
          const args = inputs(kind, style, { viewport }),
            { frame, motion } = characterEntryFrame({ ...args, progress: 1 });
          assert.equal(frame.flat, true);
          assert.equal(motion.caseAlpha + motion.peel + motion.rings + motion.puffs, 0);
          assert.deepEqual(characterEntryParticles(style, kind, 1), []);
          const sourcePoints = args.meta.topology.uv.map(([u, v]) => [
            u * args.page.width,
            v * frame.sample[3] * args.page.height,
          ]);
          for (const ids of args.meta.topology.triangles) {
            const matrix = affineTriangle(
              ids.map((i) => sourcePoints[i]),
              ids.map((i) => frame.mesh[i]),
            );
            matrix.forEach((value, i) =>
              close(
                value,
                [viewport.width / args.page.width, 0, 0, viewport.width / args.page.width, 0, 0][i],
              ),
            );
          }
        }
      });

      it("keeps every sampled triangle finite and facing forward with bounded effects", () => {
        const args = inputs(kind, style);
        for (let step = 0; step <= 100; step++) {
          const progress = step / 100,
            { frame, matrix } = characterEntryFrame({ ...args, progress }),
            particles = characterEntryParticles(style, kind, progress);
          assert.ok([...frame.mesh.flat(), ...frame.sample, ...matrix].every(Number.isFinite));
          assert.ok(particles.length <= 6);
          assert.ok(particles.every((particle) => Object.values(particle).every(Number.isFinite)));
          for (const ids of args.meta.topology.triangles) {
            const transform = affineTriangle(
              ids.map((index) => args.meta.topology.uv[index]),
              ids.map((index) => frame.mesh[index]),
            );
            assert.ok(
              transform[0] * transform[3] - transform[1] * transform[2] > 0,
              `folded triangle at ${progress}`,
            );
          }
        }
      });

      it("uses at most 72 source triangles and one exact final blit on the same canvas", async () => {
        const a = environment(),
          args = inputs(kind, style),
          done = playCharacterEntry(runtime(a, args)),
          duration = CHARACTER_ENTRY_DURATIONS[style][kind];
        assert.ok(duration >= 850 && duration <= 1400);
        for (const progress of [0, 0.12, 0.25, 0.45, 0.62, 0.82]) {
          if (progress) a.advance(progress * duration);
          const draws = a.ctx.draws.filter(({ args: [source] }) => source === args.page);
          assert.ok(draws.length > 0 && draws.length <= 72);
          assert.ok(a.ctx.transforms.flat().every(Number.isFinite));
          assert.ok(a.ctx.paths.flat().every(Number.isFinite));
        }
        a.advance(duration);
        await done;
        assert.deepEqual(a.appended, [a.canvas]);
        assert.equal(a.ctx.draws.length, 1);
        assert.deepEqual(a.ctx.draws[0].args, [
          args.page,
          0,
          0,
          393,
          (args.page.height * 393) / args.page.width,
        ]);
        assert.deepEqual(a.ctx.fills[0].args, [0, 0, 393, 844]);
        assert.equal(a.ctx.fills[0].color, kind === "scout" ? "rgb(13,12,10)" : "rgb(247,249,250)");
        assert.equal(a.frames.size + a.timers.size, 0);
        assert.equal(a.removed, false);
      });
    });
  }
}

it("gives the families different material geometry and scene choreography", () => {
  const squeeze = characterEntryMotion("tactile", "scout", 0.13),
    inflation = characterEntryMotion("absurd", "scout", 0.4),
    peel = characterEntryMotion("tactile", "references", 0.35),
    tunnel = characterEntryMotion("portal", "references", 0.35),
    orbit = characterEntryMotion("absurd", "references", 0.4);
  assert.ok(squeeze.shape.sy < 0.92 && squeeze.shape.sx > 1.04);
  assert.ok(inflation.shape.sx > 1.38 && inflation.shape.sy > 1.23);
  assert.ok(peel.peel > 0.8 && peel.rings === 0);
  assert.ok(tunnel.rings > 0.7 && tunnel.peel === 0);
  assert.ok(orbit.orbit > 0.2 && orbit.peel === 0 && orbit.rings === 0);
  assert.equal(characterEntryParticles("absurd", "references", 0.4).length, 6);
  assert.equal(characterEntryParticles("absurd", "scout", 0.3).length, 0);
  for (const kind of kinds) {
    const meshes = CHARACTER_ENTRY_STYLES.map(
      (style) => characterEntryFrame({ ...inputs(kind, style), progress: 0.5 }).frame.mesh,
    );
    for (let i = 0; i < meshes.length; i++)
      for (let j = i + 1; j < meshes.length; j++) {
        assert.ok(
          meshes[i].some(
            (point, k) => Math.hypot(point[0] - meshes[j][k][0], point[1] - meshes[j][k][1]) > 10,
          ),
        );
      }
  }
});

it("lets the orange squash, inflate and hold before its dive, with an opaque case throughout", () => {
  const squash = characterEntryMotion("absurd", "scout", 0.065),
    inflated = characterEntryMotion("absurd", "scout", 0.4),
    diving = characterEntryMotion("absurd", "scout", 0.65);
  assert.ok(squash.shape.sy < 0.96 && squash.shape.sx > 1.02);
  assert.equal(squash.camera + squash.flatten, 0);
  assert.ok(inflated.shape.sx >= 1.39 && inflated.shape.sy >= 1.24);
  assert.equal(inflated.camera + inflated.flatten, 0);
  assert.ok(diving.camera > 0.5);
  assert.equal(diving.flatten, 0);
  assert.ok(diving.shape.sx < inflated.shape.sx);
  for (const kind of kinds)
    for (let i = 0; i <= 100; i++) {
      const motion = characterEntryMotion("absurd", kind, i / 100);
      assert.ok(motion.caseAlpha === 1 || motion.caseAlpha === 0);
      assert.equal(motion.rings + motion.puffs, 0);
      if (i >= 90) {
        assert.equal(motion.flatten, 1);
        assert.deepEqual(characterEntryParticles("absurd", kind, i / 100), []);
      }
    }
});

it("keeps unreleased stickers pinned to their exact source crops with no alpha tail", () => {
  const held = characterEntryParticles("absurd", "references", 0.4, Array(6).fill(null));
  assert.equal(held.length, 6);
  for (const particle of held) {
    assert.equal(particle.scale, 1);
    close(particle.rotation, 0);
    assert.equal(particle.expansion, 0);
    assert.equal(particle.alpha, 1);
  }
  close(held[0].x, (188 + 140 / 2) / 1024);
  close(held[0].y, (139 + 58 / 2) / 1024);
  const released = characterEntryParticles("absurd", "references", 0.65, Array(6).fill(0.4));
  assert.ok(released.every((particle) => particle.expansion > 0 && particle.alpha === 1));
  assert.deepEqual(characterEntryParticles("absurd", "references", 0.82), []);
});

it("keeps the opaque References case and all departing stickers behind the emerging page", async () => {
  for (const viewport of [
    { width: 393, height: 844 },
    { width: 1180, height: 757 },
    { width: 1920, height: 1080 },
  ]) {
    const kind = "references";
    const a = environment(),
      args = inputs(kind, "absurd", {
        viewport,
        width: viewport.width,
        height: viewport.height,
        pose: computerLayout(viewport.width, viewport.height),
      });
    a.env.innerWidth = viewport.width;
    a.env.innerHeight = viewport.height;
    a.env.document.documentElement.clientWidth = viewport.width;
    a.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, ...viewport });
    const props = runtime(a, args),
      done = playCharacterEntry(props),
      duration = CHARACTER_ENTRY_DURATIONS.absurd[kind];
    for (const p of [0.48, 0.55, 0.64, 0.74, 0.82]) {
      a.advance(duration * p);
      const pageIndex = a.ctx.draws.findIndex(({ args: [source] }) => source === args.page),
        bodyDraws = a.ctx.draws.filter(({ args: [source] }) => source === props.body);
      assert.ok(pageIndex > 0);
      assert.ok(bodyDraws.length > 0 && bodyDraws.length <= 7);
      assert.ok(bodyDraws.every(({ alpha }) => alpha === 1));
      assert.ok(a.ctx.draws.slice(pageIndex).every(({ args: [source] }) => source !== props.body));
      assert.ok(a.ctx.draws.every(({ operation }) => operation !== "destination-out"));
      assert.ok(a.ctx.transforms.flat().every(Number.isFinite));
      assert.ok(a.ctx.paths.flat().every(Number.isFinite));
      if (p >= 0.82) assert.equal(bodyDraws.length, 1);
    }
    a.advance(duration * 0.9);
    assert.equal(a.ctx.draws.length, 1);
    assert.equal(a.ctx.draws[0].args[0], args.page);
    a.advance(duration);
    await done;
  }
});

it("keeps the orange page registered behind its vinyl until the aperture clears every viewport edge", () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 500, height: 754 },
    { width: 1180, height: 757 },
    { width: 1920, height: 1080 },
  ]) {
    const args = inputs("scout", "absurd", {
      viewport,
      height: viewport.height,
      pose: inflatablePose(computerLayout(viewport.width, viewport.height)),
    });
    let sawFlatten = false;
    for (let i = 0; i <= 100; i++) {
      const state = characterEntryFrame({ ...args, progress: i / 100 }),
        { matrix, motion, frame } = state,
        map = ([x, y]) => [
          matrix[0] * x + matrix[2] * y + matrix[4],
          matrix[1] * x + matrix[3] * y + matrix[5],
        ];
      if (!motion.flatten) {
        args.meta.frame.screenMesh.forEach(([x, y], index) => {
          const registered = map([x / args.meta.width, y / args.meta.width]);
          close(frame.mesh[index][0], registered[0]);
          close(frame.mesh[index][1], registered[1]);
        });
      } else {
        sawFlatten = true;
        assert.equal(state.apertureCovered, true);
        // Independently measured inside the actual PNG's rounded aperture.
        // These conservative clear-glass corners must enclose the whole view.
        const topLeft = map([345 / 1254, 315 / 1254]),
          bottomRight = map([810 / 1254, 690 / 1254]);
        assert.ok(topLeft[0] < 0 && topLeft[1] < 0);
        assert.ok(bottomRight[0] > viewport.width && bottomRight[1] > viewport.height);
      }
    }
    assert.equal(sawFlatten, true);
  }
});

it("never paints orange's sharp page over the vinyl during the dive or flatten", async () => {
  const a = environment(),
    args = inputs("scout", "absurd"),
    props = runtime(a, args),
    done = playCharacterEntry(props),
    duration = CHARACTER_ENTRY_DURATIONS.absurd.scout;
  for (const progress of [0.48, 0.55, 0.64, 0.73, 0.82, 0.89]) {
    a.advance(duration * progress);
    const pageIndex = a.ctx.draws.findIndex(({ args: [source] }) => source === props.page),
      bodyIndex = a.ctx.draws.findIndex(({ args: [source] }) => source === props.body);
    assert.ok(pageIndex >= 0 && bodyIndex > pageIndex);
    assert.equal(a.ctx.draws[bodyIndex].alpha, 1);
    assert.equal(a.ctx.draws.at(-1).args[0], props.body);
    assert.ok(
      a.ctx.draws.some(
        ({ args: [source], operation }) =>
          source === props.coverage && operation === "destination-out",
      ),
    );
  }
  a.advance(duration * 0.92);
  assert.equal(a.ctx.draws.length, 1);
  assert.equal(a.ctx.draws[0].args[0], args.page);
  a.advance(duration);
  await done;
});

it("caps orange's apparent source scale monotonically and holds it exactly through flattening", () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 500, height: 754 },
    { width: 1180, height: 758 },
    { width: 1920, height: 1080 },
  ]) {
    const args = inputs("scout", "absurd", {
        viewport,
        height: viewport.height,
        pose: inflatablePose(computerLayout(viewport.width, viewport.height)),
      }),
      initialDive = characterEntryFrame({ ...args, progress: 0.43 }),
      triangles = initialDive.sourceTopology.triangles,
      destinationScale = viewport.width / args.page.width;
    assert.deepEqual(initialDive.sourceTopology.uv, args.meta.topology.uv);
    assert.deepEqual(initialDive.frame.sample, [0, 0, 1, 1]);
    let previous = null,
      expandedSourceWindow = false;
    for (let step = 86; step <= 200; step++) {
      const progress = step / 200,
        { frame, sourceTopology } = characterEntryFrame({ ...args, progress }),
        sourcePoints = sourceTopology.uv.map(([u, v]) => [
          (frame.sample[0] + u * frame.sample[2]) * args.page.width,
          (frame.sample[1] + v * frame.sample[3]) * args.page.height,
        ]),
        scales = triangles.map((ids, i) => {
          const transform = affineTriangle(
              ids.map((index) => sourcePoints[index]),
              ids.map((index) => frame.mesh[index]),
            ),
            x = Math.hypot(transform[0], transform[1]),
            y = Math.hypot(transform[2], transform[3]),
            tolerance = destinationScale * 0.00001;
          // Test the source-to-screen transform actually used by each rendered
          // triangle, including both glyph width and height, rather than bezel
          // geometry. The tolerance is below 0.001% for perspective round-off.
          assert.ok(x <= destinationScale + tolerance && y <= destinationScale + tolerance);
          if (previous) {
            assert.ok(x + tolerance >= previous[i][0], `horizontal reversal at ${progress}`);
            assert.ok(y + tolerance >= previous[i][1], `vertical reversal at ${progress}`);
          }
          if (progress >= 0.74)
            transform.forEach((value, index) =>
              close(value, [destinationScale, 0, 0, destinationScale, 0, 0][index]),
            );
          return [x, y];
        });
      previous = scales;
      expandedSourceWindow ||= frame.sample[2] > 1 && frame.sample[0] < 0;
    }
    assert.equal(expandedSourceWindow, true);
  }
});

it("reduced motion paints only the clean destination immediately", async () => {
  for (const kind of kinds)
    for (const style of CHARACTER_ENTRY_STYLES) {
      const a = environment({ reduced: true }),
        args = inputs(kind, style);
      await playCharacterEntry(runtime(a, args));
      assert.equal(a.ctx.draws.length, 1);
      assert.equal(a.ctx.draws[0].args[0], args.page);
      assert.equal(a.ctx.paths.length, 0);
      assert.equal(a.frames.size + a.timers.size, 0);
    }
});

it("finishes against the latest viewport after width change and toolbar height change", async () => {
  for (const changeWidth of [false, true]) {
    const a = environment(),
      args = inputs("references", "absurd"),
      done = playCharacterEntry(runtime(a, args));
    a.advance(170);
    a.env.innerHeight = 932;
    if (changeWidth) {
      a.env.innerWidth = 430;
      a.env.document.documentElement.clientWidth = 430;
    }
    a.resize();
    if (!changeWidth) {
      assert.equal(a.frames.size, 1);
      a.advance(CHARACTER_ENTRY_DURATIONS.absurd.references);
    }
    await done;
    assert.equal(a.canvas.width, a.env.innerWidth * 2);
    assert.equal(a.canvas.height, 1864);
    assert.equal(a.canvas.style.width, `${a.env.innerWidth}px`);
    assert.deepEqual(a.ctx.draws[0].args, [
      args.page,
      0,
      0,
      a.env.innerWidth,
      (args.page.height * a.env.innerWidth) / args.page.width,
    ]);
    assert.equal(a.ctx.draws.length, 1);
    assert.equal(a.frames.size + a.timers.size, 0);
  }
});

it("refits a held Absurd endpoint and stops owning it when its entry signal is aborted", async () => {
  for (const kind of kinds) {
    const a = environment(),
      args = inputs(kind, "absurd"),
      controller = new AbortController(),
      done = playCharacterEntry({ ...runtime(a, args), signal: controller.signal });
    a.advance(CHARACTER_ENTRY_DURATIONS.absurd[kind]);
    await done;
    a.env.innerWidth = 1186;
    a.env.innerHeight = 760;
    a.env.document.documentElement.clientWidth = 1186;
    a.env.document.documentElement.getBoundingClientRect = () => ({ width: 1171 });
    a.resize();
    assert.equal(a.canvas.width, 2342);
    assert.equal(a.canvas.height, 1520);
    assert.equal(a.ctx.draws.length, 1);
    assert.deepEqual(a.ctx.draws[0].args, [
      args.page,
      0,
      0,
      1171,
      (args.page.height * 1171) / args.page.width,
    ]);
    assert.equal(a.frames.size + a.timers.size, 0);
    controller.abort();
    a.env.innerWidth = 640;
    a.resize();
    assert.equal(a.canvas.width, 2342);
    assert.equal(a.removed, false);
  }
});

it("keeps the full source inside a reserved scrollbar gutter at wide and narrow widths", async () => {
  for (const innerWidth of [1186, 644]) {
    const a = environment(),
      args = inputs("scout", "tactile"),
      contentWidth = innerWidth - 15;
    a.env.innerWidth = innerWidth;
    a.env.document.documentElement.clientWidth = innerWidth;
    a.env.document.documentElement.getBoundingClientRect = () => ({ width: contentWidth });
    const done = playCharacterEntry(runtime(a, args));
    assert.equal(a.canvas.width, contentWidth * 2);
    a.advance(CHARACTER_ENTRY_DURATIONS.tactile.scout);
    await done;
    assert.equal(a.canvas.style.width, `${contentWidth}px`);
    assert.equal(a.ctx.draws.length, 1);
    assert.deepEqual(a.ctx.draws[0].args, [
      args.page,
      0,
      0,
      contentWidth,
      (args.page.height * contentWidth) / args.page.width,
    ]);
  }
});

it("abort cancels pending work and removes the promoted canvas without drawing the destination", async () => {
  const a = environment(),
    args = inputs("references", "portal"),
    controller = new AbortController(),
    done = playCharacterEntry({ ...runtime(a, args), signal: controller.signal });
  a.advance(300);
  const before = [...a.ctx.draws];
  controller.abort();
  await assert.rejects(done, { name: "AbortError" });
  a.advance(2000);
  assert.equal(a.removed, true);
  assert.deepEqual(a.ctx.draws, before);
  assert.equal(a.frames.size + a.timers.size, 0);
});

it("an already aborted entry leaves the existing canvas where it is", async () => {
  const a = environment(),
    controller = new AbortController();
  controller.abort();
  await assert.rejects(playCharacterEntry({ ...runtime(a, inputs()), signal: controller.signal }), {
    name: "AbortError",
  });
  assert.equal(a.appended.length, 0);
  assert.equal(a.removed, false);
  assert.equal(a.frames.size + a.timers.size, 0);
});

it("visibility loss settles to the exact destination and clears all scheduled work", async () => {
  const a = environment(),
    args = inputs("scout", "absurd"),
    done = playCharacterEntry(runtime(a, args));
  a.advance(180);
  a.env.document.hidden = true;
  a.env.document.dispatchEvent(new Event("visibilitychange"));
  await done;
  assert.equal(a.ctx.draws.length, 1);
  assert.equal(a.ctx.draws[0].args[0], args.page);
  assert.equal(a.frames.size + a.timers.size, 0);
});

it("preserves the displayed viewport pose when the primary canvas is promoted", async () => {
  const a = environment(),
    args = inputs("scout", "tactile"),
    props = runtime(a, args),
    done = playCharacterEntry(props),
    matrix = a.ctx.transforms.at(-1);
  close(matrix[0], args.pose.s);
  close(matrix[3], args.pose.s);
  close(matrix[4], args.pose.x + 17);
  close(matrix[5], args.pose.y + 31);
  assert.deepEqual(
    a.ctx.draws.slice(-3).map(({ args: [image], operation }) => [image, operation]),
    [
      [props.coverage, "destination-out"],
      [props.glass, "screen"],
      [props.body, "source-over"],
    ],
  );
  a.advance(CHARACTER_ENTRY_DURATIONS.tactile.scout);
  await done;
});

it("lets the References foil sheet move in front of its departing bezel", async () => {
  const a = environment(),
    args = inputs("references", "tactile"),
    props = runtime(a, args),
    done = playCharacterEntry(props);
  a.advance(CHARACTER_ENTRY_DURATIONS.tactile.references * 0.4);
  assert.equal(a.ctx.draws[0].args[0], props.body);
  assert.equal(a.ctx.draws[1].args[0], props.page);
  assert.ok(a.ctx.draws.every(({ operation }) => operation !== "destination-out"));
  a.advance(CHARACTER_ENTRY_DURATIONS.tactile.references);
  await done;
});
