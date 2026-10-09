import { describe, expect, it } from "bun:test";
import { affineTriangle, fittedPageFrame } from "../public/experience/konami-page-projection.js";

describe("fitted page entry", () => {
  it("maps every sampled triangle corner into the displayed screen", () => {
    const source = [
      [40, 80],
      [1228, 80],
      [40, 1008],
    ];
    const target = [
      [120, 210],
      [390, 215],
      [100, 430],
    ];
    const m = affineTriangle(source, target);
    expect(m).not.toBeNull();
    for (let i = 0; i < 3; i++) {
      const [x, y] = source[i];
      expect(m[0] * x + m[2] * y + m[4]).toBeCloseTo(target[i][0], 8);
      expect(m[1] * x + m[3] * y + m[5]).toBeCloseTo(target[i][1], 8);
    }
    expect(
      affineTriangle(
        [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
        target,
      ),
    ).toBeNull();
  });
  it("preserves the starting aperture and scrolling sample", () => {
    const quad = [
      [100, 200],
      [350, 190],
      [360, 410],
      [90, 420],
    ];
    const frame = fittedPageFrame(quad, { width: 1188, height: 2168 }, 390, 844, 0.43, 0.2, 0);
    expect(frame.quad).toEqual(quad);
    expect(frame.sample).toEqual([0, 0.2, 1, 0.43]);
  });
  it("ends on the exact full-width handoff pixels without two text scales", () => {
    for (const [width, height] of [
      [390, 844],
      [644, 757],
      [1180, 757],
    ]) {
      for (const source of [
        { width: 1188, height: 2168 },
        { width: 1150, height: 899 },
      ]) {
        const frame = fittedPageFrame(
          [
            [0, 0],
            [250, 0],
            [250, 200],
            [0, 200],
          ],
          source,
          width,
          height,
          0.43,
          0.3,
          1,
        );
        expect(frame.quad).toEqual([
          [0, 0],
          [width, 0],
          [width, height],
          [0, height],
        ]);
        expect(frame.sample.slice(0, 3)).toEqual([0, 0, 1]);
        const cropHeight = frame.sample[3] * source.height;
        const m = affineTriangle(
          [
            [0, 0],
            [source.width, 0],
            [0, cropHeight],
          ],
          [
            [0, 0],
            [width, 0],
            [0, height],
          ],
        );
        expect(m[0]).toBeCloseTo(width / source.width, 10);
        expect(m[3]).toBeCloseTo(width / source.width, 10);
        expect(m[1]).toBeCloseTo(0, 10);
        expect(m[2]).toBeCloseTo(0, 10);
        expect(m[4]).toBeCloseTo(0, 10);
        expect(m[5]).toBeCloseTo(0, 10);
      }
    }
  });
});
