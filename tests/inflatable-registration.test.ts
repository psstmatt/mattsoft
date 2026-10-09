import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  INFLATABLE_ASSET,
  inflatableScreenGeometry,
  inflatablePose,
} from "../public/experience/inflatable-registration.js";
import { computerLayout } from "../public/experience/konami-layout.js";

const original = JSON.parse(
  readFileSync(new URL("../public/experience/shared-screen-center.json", import.meta.url), "utf8"),
);
test("inflatable uses the generated alpha asset and its own complete screen registration", () => {
  const asset = readFileSync(new URL(`../public${INFLATABLE_ASSET}`, import.meta.url));
  expect(asset.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(asset.readUInt32BE(16)).toBe(1254);
  expect(asset.readUInt32BE(20)).toBe(1254);
  expect(asset[25]).toBe(6); // RGBA: preserve opening and outside transparency.
  const saved = JSON.stringify(original),
    next = inflatableScreenGeometry(original);
  expect(JSON.stringify(original)).toBe(saved);
  expect(next.topology).toBe(original.topology);
  expect(next.frame.screenMesh).toHaveLength(original.topology.uv.length);
  for (const [index, uv] of original.topology.uv.entries()) {
    const [x, y] = next.frame.screenMesh[index];
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThanOrEqual((258 * next.width) / 1254);
    expect(x).toBeLessThanOrEqual((881 * next.width) / 1254);
    if (uv[0] === 0 && uv[1] === 0) expect([x, y]).toEqual(next.frame.screenQuad[0]);
    if (uv[0] === 1 && uv[1] === 1) expect([x, y]).toEqual(next.frame.screenQuad[2]);
  }
});

test("inflatable body remains fitted through mobile toolbar sizes and narrow screens", () => {
  for (const width of [320, 390, 430, 500, 1188])
    for (const height of [568, 724, 844]) {
      const pose = inflatablePose(computerLayout(width, height));
      const left = pose.x + (pose.s * 120) / 1254,
        right = pose.x + (pose.s * 1123) / 1254;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(width);
      if (width <= 700) expect(right - left).toBeLessThan(width * 0.58);
    }
});
