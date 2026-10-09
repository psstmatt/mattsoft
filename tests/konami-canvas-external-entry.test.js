import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  affineTriangle,
  fittedPortfolioFrame,
  paintPortfolioFrame,
  portfolioEntryTopology,
} from "../public/experience/konami-page-projection.js";
import {
  inflatableScreenGeometry,
  inflatablePose,
} from "../public/experience/inflatable-registration.js";
import { computerLayout } from "../public/experience/konami-layout.js";
import { entryFittedTarget } from "../public/experience/konami-canvas-entry.js";
import {
  previewSourceDimensions,
  previewSampleHeight,
} from "../public/experience/konami-screen-source.js";

const shared = JSON.parse(
  readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url)),
);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const cases = [
  {
    kind: "scout",
    geometry: inflatableScreenGeometry(shared),
    width: 1150,
    height: 228,
    pixel: [13, 12, 10, 255],
  },
  { kind: "references", geometry: shared, width: 1173, height: 2168, pixel: [255, 255, 255, 255] },
];

function capture(testCase) {
  const { width, height } = previewSourceDimensions(testCase.width, testCase.height);
  return Object.freeze({
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    cssWidth: testCase.width,
    cssLeft: 17,
    getContext: () => ({ getImageData: () => ({ data: testCase.pixel }) }),
  });
}

function entry(
  testCase,
  progress,
  {
    source = capture(testCase),
    stage = { width: 393, height: 664 },
    viewport = { width: 393, height: 844 },
    scroll = testCase.kind === "scout" ? 0 : 0.2,
  } = {},
) {
  const { geometry } = testCase,
    initial = computerLayout(stage.width, stage.height),
    start = testCase.kind === "scout" ? inflatablePose(initial) : initial,
    bounds = {
      x0: Math.min(...geometry.frame.screenMesh.map(([x]) => x / geometry.width)),
      x1: Math.max(...geometry.frame.screenMesh.map(([x]) => x / geometry.width)),
      y0: Math.min(...geometry.frame.screenMesh.map(([, y]) => y / geometry.width)),
    },
    end = entryFittedTarget(bounds, viewport.width),
    eased = 1 - Math.pow(1 - progress, 3),
    pose = Object.fromEntries(
      Object.keys(start).map((key) => [key, start[key] + (end[key] - start[key]) * eased]),
    );
  const frame = fittedPortfolioFrame({
    mesh: geometry.frame.screenMesh,
    topology: geometry.topology,
    sourceSize: geometry.width,
    source,
    pose,
    viewport,
    sampleStart: [0, 0, 1, previewSampleHeight(source, true, stage.height)],
    sampleEnd: [0, 0, 1, (viewport.height * source.width) / (viewport.width * source.height)],
    scroll,
    progress,
    displayWidth: viewport.width,
    displayLeft: 0,
  });
  return { frame, start };
}

function paintRecorder() {
  const draws = [],
    fills = [],
    transforms = [],
    boundary = [];
  return {
    draws,
    fills,
    transforms,
    boundary,
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    fill() {},
    clip() {},
    moveTo: (...point) => boundary.push(point),
    lineTo: (...point) => boundary.push(point),
    fillRect(...args) {
      fills.push({ color: this.fillStyle, args });
    },
    transform: (...args) => transforms.push(args),
    drawImage: (...args) => draws.push(args),
  };
}

for (const testCase of cases) {
  describe(`Canvas ${testCase.kind} entry source fidelity`, () => {
    it("starts on the actual registered mesh and its displayed source window", () => {
      const source = capture(testCase),
        { frame, start } = entry(testCase, 0, { source }),
        { frame: next } = entry(testCase, 1e-7, { source });
      frame.mesh.forEach(([x, y], i) => {
        close(
          x,
          start.x + (testCase.geometry.frame.screenMesh[i][0] / testCase.geometry.width) * start.s,
        );
        close(
          y,
          start.y + (testCase.geometry.frame.screenMesh[i][1] / testCase.geometry.width) * start.s,
        );
        assert.ok(Math.hypot(next.mesh[i][0] - x, next.mesh[i][1] - y) < 0.001);
      });
      assert.deepEqual(frame.sample, [
        0,
        testCase.kind === "scout" ? 0 : 0.2,
        1,
        previewSampleHeight(source, true, 664),
      ]);
      assert.equal(frame.flat, false);
    });

    it("ends every triangle at one uniform full-capture-width pixel scale", () => {
      for (const viewport of [
        { width: 320, height: 568 },
        { width: 393, height: 844 },
        { width: 430, height: 932 },
        { width: 1180, height: 757 },
      ]) {
        const source = capture(testCase),
          { frame } = entry(testCase, 1, { source, viewport });
        const sourcePoints = testCase.geometry.topology.uv.map(([u, v]) => [
          (frame.sample[0] + u * frame.sample[2]) * source.width,
          (frame.sample[1] + v * frame.sample[3]) * source.height,
        ]);
        for (const ids of testCase.geometry.topology.triangles) {
          const matrix = affineTriangle(
            ids.map((i) => sourcePoints[i]),
            ids.map((i) => frame.mesh[i]),
          );
          matrix.forEach((value, i) =>
            close(
              value,
              [viewport.width / source.width, 0, 0, viewport.width / source.width, 0, 0][i],
            ),
          );
        }
        close(Math.min(...frame.mesh.map(([x]) => x)), 0);
        close(Math.max(...frame.mesh.map(([x]) => x)), viewport.width);
        close(Math.min(...frame.mesh.map(([, y]) => y)), 0);
        close(Math.max(...frame.mesh.map(([, y]) => y)), viewport.height);
        assert.equal(frame.flat, true);
        assert.equal(frame.offsetX, 0);
      }
    });

    it("returns scroll continuously and never moves geometry in response to scroll", () => {
      const source = capture(testCase),
        maxScroll = 1 - previewSampleHeight(source, true, 664);
      for (const progress of [0, 0.1, 0.2, 0.38, 0.5, 0.75, 0.999, 1]) {
        const { frame } = entry(testCase, progress, { source, scroll: maxScroll }),
          { frame: unscrolled } = entry(testCase, progress, { source, scroll: 0 });
        assert.deepEqual(frame.mesh, unscrolled.mesh);
        close(frame.sample[1], maxScroll * Math.max(0, 1 - progress / 0.38));
        for (const ids of testCase.geometry.topology.triangles) {
          const matrix = affineTriangle(
            ids.map((i) => testCase.geometry.topology.uv[i]),
            ids.map((i) => frame.mesh[i]),
          );
          assert.ok(matrix[0] * matrix[3] - matrix[1] * matrix[2] > 0);
        }
      }
      if (testCase.kind === "scout") assert.equal(maxScroll, 0);
    });

    it("paints the immutable original source within 72 triangle draws then one exact blit", () => {
      const source = capture(testCase),
        saved = { ...source },
        viewport = { width: 393, height: 844 };
      assert.equal(portfolioEntryTopology(testCase.geometry.topology).triangles.length, 72);
      for (const progress of [0, 0.0001, 0.3, 0.75, 0.999, 1]) {
        const ctx = paintRecorder(),
          { frame } = entry(testCase, progress, { source, viewport });
        paintPortfolioFrame(ctx, source, frame, testCase.geometry.topology);
        assert.ok(ctx.draws.length > 0 && ctx.draws.length <= 72);
        assert.ok(ctx.draws.every(([image]) => image === source));
        if (progress === 1) {
          assert.deepEqual(ctx.draws, [
            [source, 0, 0, viewport.width, (source.height * viewport.width) / source.width],
          ]);
          assert.deepEqual(ctx.fills, [
            {
              color: `rgb(${testCase.pixel.slice(0, 3).join(",")})`,
              args: [0, 0, viewport.width, viewport.height],
            },
          ]);
          assert.equal(ctx.transforms.length, 0);
          if (testCase.kind === "scout") {
            assert.ok(frame.cssHeight < viewport.height);
            assert.ok((testCase.height * viewport.width) / testCase.width < 80);
            assert.ok(frame.sample[3] > 1);
          }
        } else assert.equal(ctx.transforms.length, ctx.draws.length);
      }
      assert.deepEqual(source, saved);
    });
  });
}

it("keeps the external entry on the direct source mesh path and its primary canvas", () => {
  const scene = readFileSync(
      new URL("../public/experience/konami-canvas-scene.js", import.meta.url),
      "utf8",
    ),
    paint = scene.slice(scene.indexOf("paint(pose, progress, viewport)")),
    external = paint.slice(
      paint.indexOf("} else {"),
      paint.indexOf('ctx.globalCompositeOperation = "screen"'),
    );
  assert.ok(external.includes("mesh: meta.frame.screenMesh"));
  assert.ok(external.includes("paintPortfolioFrame(ctx, page, frame, meta.topology)"));
  assert.ok(external.includes("displayWidth: viewport.width"));
  assert.ok(external.includes("displayLeft: 0"));
  assert.ok(external.includes('ctx.globalCompositeOperation = "destination-out"'));
  assert.ok(!paint.includes("drawImage(screen"));
  assert.ok(!paint.includes("rebuild("));
  assert.ok(!scene.includes("fittedPageFrame"));
  assert.ok(!scene.includes("paintProjectedPage"));
  assert.ok(!scene.includes("fadeCanvasToPreview"));
});
