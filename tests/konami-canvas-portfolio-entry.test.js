import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { portfolioRasterSample } from "../public/experience/konami-canvas-scene.js";
import {
  affineTriangle,
  fittedPortfolioFrame,
  paintPortfolioFrame,
  portfolioEntryTopology,
} from "../public/experience/konami-page-projection.js";

const geometry = JSON.parse(
  readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url)),
);
const bounds = {
  x0: Math.min(...geometry.frame.screenMesh.map(([x]) => x / geometry.width)),
  x1: Math.max(...geometry.frame.screenMesh.map(([x]) => x / geometry.width)),
  y0: Math.min(...geometry.frame.screenMesh.map(([, y]) => y / geometry.width)),
  y1: Math.max(...geometry.frame.screenMesh.map(([, y]) => y / geometry.width)),
};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

function capture(cssWidth = 393) {
  return Object.freeze({
    width: cssWidth * 2,
    height: 4800,
    naturalWidth: cssWidth * 2,
    naturalHeight: 4800,
    cssWidth,
    getContext: () => ({ getImageData: () => ({ data: [249, 249, 245, 255] }) }),
  });
}

function entry(
  progress,
  {
    source = capture(),
    stage = { width: 393, height: 664 },
    viewport = { width: 393, height: 844 },
    scroll = 0.2,
  } = {},
) {
  return fittedPortfolioFrame({
    mesh: geometry.frame.screenMesh,
    topology: geometry.topology,
    sourceSize: geometry.width,
    pose: { x: 30, y: 140, s: 340 },
    source,
    viewport,
    sampleStart: portfolioRasterSample(bounds, stage.width, stage.height, source),
    sampleEnd: portfolioRasterSample(bounds, viewport.width, viewport.height, source),
    scroll,
    progress,
  });
}

describe("Canvas Portfolio entry source fidelity", () => {
  it("starts on every original curved vertex and the displayed scrolling viewport", () => {
    const source = capture(),
      frame = entry(0, { source });
    frame.mesh.forEach(([x, y], i) => {
      close(x, 30 + (geometry.frame.screenMesh[i][0] / geometry.width) * 340);
      close(y, 140 + (geometry.frame.screenMesh[i][1] / geometry.width) * 340);
    });
    assert.deepEqual(frame.sample, portfolioRasterSample(bounds, 393, 664, source, 0.2));
    assert.equal(frame.flat, false);
  });

  it("lands every triangle at source CSS scale and covers a taller toolbar-free viewport", () => {
    for (const viewport of [
      { width: 393, height: 664 },
      { width: 393, height: 844 },
      { width: 1180, height: 757 },
    ]) {
      for (const gutter of [0, 15]) {
        const source = capture(viewport.width - gutter),
          frame = entry(1, { source, viewport });
        const uv = geometry.topology.uv.map(([u, v]) => [
          (frame.sample[0] + u * frame.sample[2]) * source.width,
          (frame.sample[1] + v * frame.sample[3]) * source.height,
        ]);
        for (const triangle of geometry.topology.triangles) {
          const transform = affineTriangle(
            triangle.map((i) => uv[i]),
            triangle.map((i) => frame.mesh[i]),
          );
          const expected = [
            source.cssWidth / source.width,
            0,
            0,
            source.cssWidth / source.width,
            0,
            0,
          ];
          transform.forEach((value, i) => close(value, expected[i]));
        }
        assert.ok(Math.min(...frame.mesh.map(([x]) => x)) <= 0);
        assert.ok(Math.max(...frame.mesh.map(([x]) => x)) >= viewport.width);
        assert.ok(Math.min(...frame.mesh.map(([, y]) => y)) <= 0);
        assert.ok(Math.max(...frame.mesh.map(([, y]) => y)) >= viewport.height);
        assert.equal(frame.flat, true);
      }
    }
  });

  it("uses the captured surface left edge instead of centering a scrollbar gutter", () => {
    for (const cssLeft of [0, 8]) {
      const source = { ...capture(378), cssLeft },
        frame = entry(1, { source });
      assert.equal(frame.offsetX, cssLeft);
      const index = geometry.topology.uv.findIndex(([u, v]) => u === 0 && v === 0);
      close(frame.mesh[index][0] - frame.sample[0] * source.cssWidth, cssLeft);
    }
  });

  it("bounds phone frame cost while retaining actual mesh vertices, UVs, and the full boundary", () => {
    const simplified = portfolioEntryTopology(geometry.topology);
    assert.equal(simplified.triangles.length, 72);
    assert.equal(simplified.uv, geometry.topology.uv);
    assert.equal(simplified.boundaryVertexIndices.length, 24);
    assert.equal(portfolioEntryTopology(geometry.topology), simplified);
    for (const index of simplified.triangles.flat()) {
      assert.ok(geometry.frame.screenMesh[index]);
      assert.ok((index % 25) % 4 === 0);
      assert.ok(Math.floor(index / 25) % 3 === 0);
    }
    const area = simplified.triangles.reduce((sum, ids) => {
      const [a, b, c] = ids.map((i) => simplified.uv[i]);
      return sum + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    }, 0);
    close(area, 1);
  });

  it("continuously expands the sampled viewport and returns scroll without moving the glass", () => {
    const source = capture();
    const original = portfolioRasterSample(bounds, 393, 664, source),
      destination = portfolioRasterSample(bounds, 393, 844, source);
    let previousHeight = original[3];
    for (const progress of [0, 0.1, 0.2, 0.38, 0.5, 0.75, 0.999, 1]) {
      const frame = entry(progress, { source }),
        unscrolled = entry(progress, { source, scroll: 0 });
      assert.deepEqual(frame.mesh, unscrolled.mesh);
      assert.ok(frame.sample[3] >= previousHeight);
      assert.ok(frame.sample[3] <= destination[3]);
      close(frame.sample[1] - unscrolled.sample[1], 0.2 * Math.max(0, 1 - progress / 0.38));
      for (const triangle of geometry.topology.triangles) {
        const transform = affineTriangle(
          triangle.map((i) => geometry.topology.uv[i]),
          triangle.map((i) => frame.mesh[i]),
        );
        assert.ok(transform[0] * transform[3] - transform[1] * transform[2] > 0);
      }
      previousHeight = frame.sample[3];
    }
  });

  it("paints original capture pixels throughout and one exact page blit at the endpoint", () => {
    const source = capture(),
      calls = [],
      transforms = [];
    const ctx = {
      save() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      fill() {},
      clip() {},
      fillRect() {},
      transform: (...args) => transforms.push(args),
      drawImage: (...args) => calls.push(args),
    };
    for (const progress of [0, 0.3, 0.75, 1]) {
      calls.length = 0;
      transforms.length = 0;
      paintPortfolioFrame(ctx, source, entry(progress, { source }), geometry.topology);
      assert.ok(calls.length > 0);
      assert.ok(calls.length <= 72);
      assert.ok(calls.every(([image]) => image === source));
      if (progress === 1) {
        assert.deepEqual(calls, [[source, 0, 0, 393, 2400]]);
        assert.equal(transforms.length, 0);
      } else assert.equal(transforms.length, calls.length);
    }
    assert.equal(source.width, 786);
    assert.equal(source.height, 4800);
    assert.equal(source.cssWidth, 393);
  });

  it("uses the direct source path instead of enlarging the idle CRT raster", () => {
    const scene = readFileSync(
      new URL("../public/experience/konami-canvas-scene.js", import.meta.url),
      "utf8",
    );
    const paint = scene.slice(scene.indexOf("paint(pose, progress, viewport)"));
    const portfolio = paint.slice(
      paint.indexOf('if (kind === "portfolio")'),
      paint.indexOf("} else {"),
    );
    assert.ok(portfolio.includes("paintPortfolioFrame(ctx, page, frame, meta.topology)"));
    assert.ok(!portfolio.includes("drawImage(screen"));
    assert.ok(!portfolio.includes("rebuild("));
  });
});
