import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  referenceScreenFrame,
  referenceAngleBank,
  validateAngleBank,
  pointerCameraRequest,
  createCanvasAngleBank,
} from "../public/experience/konami-angle-bank.js";
import { mountCanvasComputer } from "../public/experience/konami-canvas-scene.js";
import { rendererEnvironment } from "./helpers/computer-renderer-environment.js";

const shared = JSON.parse(
    readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url)),
  ),
  definition = referenceAngleBank(shared),
  flush = async () => {
    for (let n = 0; n < 50; n++) await Promise.resolve();
  };

describe("registered camera banks", () => {
  it("reconstructs the original center projection exactly and has all 57 matched frames", () => {
    assert.deepEqual(referenceScreenFrame(shared, 9 + 1e-12, 1), shared.frame);
    assert.equal(validateAngleBank(definition), definition);
    assert.equal(Object.keys(definition.frames).length, 57);
    for (const [id, frame] of Object.entries(definition.frames)) {
      assert.ok(frame.case.endsWith(`case-${id}.webp`));
      assert.ok(frame.coverage.endsWith(`case-${id}.webp`));
      assert.ok(frame.glass.endsWith(`glass-${id}.webp`));
      assert.equal(frame.screenMesh.length, shared.topology.uv.length);
      for (const [a, b, c] of shared.topology.triangles) {
        const [p, q, r] = [a, b, c].map((index) => frame.screenMesh[index]);
        assert.ok((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]) < 0);
      }
    }
    const center = shared.frame.screenMesh,
      edge = definition.frames["0-0"].screenMesh;
    // The projected tube changes shape. A flat translation cannot produce it.
    const displacements = edge.map((point, index) => point[0] - center[index][0]);
    assert.ok(Math.max(...displacements) - Math.min(...displacements) > 5);
  });

  it("rejects unreviewed, incomplete, or invalid registrations", () => {
    assert.throws(() => validateAngleBank({ ...definition, validated: false }));
    assert.throws(() =>
      validateAngleBank({ ...definition, frames: { "1-9": definition.frames["1-9"] } }),
    );
    assert.throws(() =>
      validateAngleBank({
        ...definition,
        topology: { ...definition.topology, triangles: [[0, 1, 9000]] },
      }),
    );
    const folded = structuredClone(definition);
    [folded.frames["2-18"].screenMesh[0], folded.frames["2-18"].screenMesh[1]] = [
      folded.frames["2-18"].screenMesh[1],
      folded.frames["2-18"].screenMesh[0],
    ];
    assert.throws(() => validateAngleBank(folded), /folded screen/);
  });

  it("uses the same bounded pointer camera request as Green", () => {
    assert.deepEqual(pointerCameraRequest({ x: 0, y: 0 }, definition), { column: 9, row: 1 });
    assert.deepEqual(pointerCameraRequest({ x: 100, y: -100 }, definition), {
      column: 15.3,
      row: 1.75,
    });
  });

  it("loads only requested complete frames, bounds memory, and releases late results after disposal", async () => {
    const jobs = [],
      released = [],
      initial = { id: "1-9", complete: true },
      bank = createCanvasAngleBank({
        definition,
        initial,
        maxFrames: 4,
        concurrency: 2,
        loadFrame: (_, id) => new Promise((resolve) => jobs.push({ id, resolve })),
        releaseFrame: (frame) => released.push(frame.id),
      });
    assert.equal(jobs.length, 0);
    assert.equal(bank.select({ row: 1, column: 15 }), initial);
    await flush();
    assert.equal(jobs.length, 2);
    assert.equal(bank.pending, 2);
    for (let i = 0; i < 8; i++) {
      bank.select({ row: i % 3, column: 15 - i });
      for (const job of jobs.splice(0)) job.resolve({ id: job.id, complete: true });
      await flush();
      assert.ok(bank.size <= 4);
      assert.ok(bank.pending <= 2);
      assert.equal(bank.select({ row: 1, column: 9 }, false), initial);
    }
    bank.select({ row: 2, column: 0 });
    await flush();
    const late = jobs.splice(0);
    bank.dispose();
    late.forEach((job) => job.resolve({ id: job.id, complete: true }));
    await flush();
    assert.equal(bank.size, 0);
    assert.ok(released.includes("1-9"));
    assert.ok(late.every((job) => released.includes(job.id)));
  });
});

for (const accepted of [false, true]) {
  it(`keeps an unvalidated Scout bank static or loads an accepted matched bank (${accepted})`, async () => {
    const test = rendererEnvironment({ kind: "scout" }),
      manifestUrl = "/experience/models/test-angle-bank/manifest.json",
      source = {
        ...shared,
        width: 16,
        height: 16,
        frame: Object.fromEntries(
          Object.entries(shared.frame).map(([key, points]) => [
            key,
            points.map((point) => point.map((value) => value / 48)),
          ]),
        ),
      },
      manifest = referenceAngleBank(source),
      originalFetch = test.env.fetch,
      OriginalImage = test.env.Image,
      requests = [];
    manifest.validated = accepted;
    for (const [id, frame] of Object.entries(manifest.frames)) {
      frame.case = `frames/case-${id}.webp`;
      frame.glass = `frames/glass-${id}.webp`;
      delete frame.coverage;
    }
    test.env.fetch = async (url) =>
      url === manifestUrl ? { ok: true, json: async () => manifest } : originalFetch(url);
    test.env.Image = class extends OriginalImage {
      set src(value) {
        this.source = value;
        if (value) requests.push(value);
      }
      get src() {
        return this.source;
      }
    };
    test.install();
    let scene;
    try {
      scene = await mountCanvasComputer(test.element, new AbortController().signal, {
        angleBankUrl: manifestUrl,
      });
      assert.equal(test.element.dataset.angleBankStatus, accepted ? "ready" : "fallback");
      assert.equal(test.element.dataset.cameraFrame, accepted ? "1-9" : undefined);
      const generated = () => requests.filter((path) => path.includes("test-angle-bank/frames"));
      assert.equal(generated().length, accepted ? 2 : 0);
      test.move(710, 390);
      for (let now = 16; now <= 1200; now += 16) {
        test.advance(now);
        await flush();
      }
      if (accepted) {
        assert.notEqual(test.element.dataset.cameraFrame, "1-9");
        assert.ok(generated().length < 30);
        scene.setActive(false);
        assert.equal(test.element.dataset.cameraFrame, "1-9");
      } else assert.equal(generated().length, 0);
    } finally {
      scene?.dispose();
      test.restore();
    }
  });
}

it("renders References camera views atomically and restores center on inactive/reduced motion", async () => {
  const test = rendererEnvironment({ kind: "references" });
  const OriginalImage = test.env.Image;
  test.env.Image = class extends OriginalImage {
    set src(value) {
      this.source = value;
      // These are the actual audited asset sizes. Registration stays in a
      // separate common coordinate space, as it does in the WebGL renderer.
      const size = value.includes("references-chrome-baked")
        ? 1024
        : value.includes("glass-")
          ? 480
          : 960;
      this.naturalWidth = this.naturalHeight = size;
    }
    get src() {
      return this.source;
    }
  };
  test.install();
  let scene;
  try {
    scene = await mountCanvasComputer(test.element, new AbortController().signal);
    const pose = scene.canvas.context.draws.at(-1).args.slice(),
      centerLeft = test.button.style.left;
    assert.equal(test.element.dataset.cameraFrame, "1-9");
    assert.equal(test.frames.size, 0);
    test.move(710, 390);
    for (let now = 16; now <= 1600; now += 16) {
      test.advance(now);
      await flush();
    }
    assert.notEqual(test.element.dataset.cameraFrame, "1-9");
    assert.notEqual(test.button.style.left, centerLeft);
    assert.deepEqual(scene.canvas.context.draws.at(-1).args, pose);
    assert.equal(test.frames.size, 0);
    const composite = scene.canvas.context.draws.at(-1).source,
      caseSource = composite.context.draws.at(-1).source;
    assert.ok(caseSource.src.endsWith(`case-${test.element.dataset.cameraFrame}.webp`));
    assert.equal(composite.context.draws.at(-1).alpha, 1);
    scene.setActive(false);
    assert.equal(test.element.dataset.cameraFrame, "1-9");
    assert.equal(test.button.style.left, centerLeft);
    scene.setActive(true);
    test.move(710, 390);
    test.advance(1700);
    test.reducedMedia.matches = true;
    test.reducedMedia.dispatchEvent(new Event("change"));
    assert.equal(test.element.dataset.cameraFrame, "1-9");
    assert.equal(test.frames.size, 0);
    test.move(710, 390, "touch");
    assert.equal(test.element.dataset.cameraFrame, "1-9");
  } finally {
    scene?.dispose();
    test.restore();
  }
});

for (const cancel of [false, true]) {
  it(`recenters References before center-calibrated sticker entry without a tap snap (${cancel ? "cancel" : "finish"})`, async () => {
    const test = rendererEnvironment({ kind: "references" });
    test.install();
    let scene;
    try {
      scene = await mountCanvasComputer(test.element, new AbortController().signal, {
        entryMotion: "absurd",
      });
      test.move(850, 390);
      for (let now = 16; now <= 1600; now += 16) {
        test.advance(now);
        await flush();
      }
      const originalFrame = test.element.dataset.cameraFrame,
        originalPose = scene.canvas.context.draws.at(-1).args.slice(),
        originalScroll = test.element.dataset.previewScroll;
      assert.notEqual(originalFrame, "1-9");
      const entry = scene.enter({ style: {} });
      const rejected = cancel ? assert.rejects(entry, { name: "AbortError" }) : null;
      assert.equal(test.element.dataset.cameraFrame, originalFrame);
      assert.deepEqual(scene.canvas.context.draws.at(-1).args, originalPose);
      assert.notEqual(scene.canvas.style.position, "fixed");
      assert.equal(test.element.dataset.cameraRecentering, "true");
      await flush();
      await flush();
      assert.equal(test.frames.size, 1);
      const frames = [originalFrame];
      for (let now = 1616; now <= 1696; now += 16) {
        test.advance(now);
        frames.push(test.element.dataset.cameraFrame);
        assert.deepEqual(scene.canvas.context.draws.at(-1).args, originalPose);
        assert.equal(test.element.dataset.previewScroll, originalScroll);
      }
      assert.ok(new Set(frames).size > 1);
      assert.notEqual(test.element.dataset.cameraFrame, "1-9");
      if (cancel) {
        await scene.resetEntry();
        await rejected;
        assert.equal(test.element.dataset.cameraRecentering, "false");
        assert.equal(test.element.dataset.cameraFrame, "1-9");
        assert.notEqual(scene.canvas.style.position, "fixed");
        assert.equal(test.frames.size, 0);
        test.advance(4000);
        assert.equal(test.element.dataset.cameraFrame, "1-9");
      } else {
        test.advance(1840);
        await flush();
        assert.equal(test.element.dataset.cameraFrame, "1-9");
        assert.equal(test.element.dataset.cameraRecentering, "false");
        assert.equal(scene.canvas.style.position, "fixed");
        const centerBodies = scene.canvas.context.draws.filter(({ source }) =>
          source.src?.includes("references-chrome-baked/frames/case-1-9.webp"),
        );
        assert.ok(centerBodies.length > 0);
        assert.ok(centerBodies.every(({ source }) => source.naturalWidth === 1024));
        test.advance(3400);
        await entry;
      }
    } finally {
      scene?.dispose();
      test.restore();
    }
  });
}
