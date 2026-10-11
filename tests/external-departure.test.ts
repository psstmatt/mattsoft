import { describe, expect, it } from "bun:test";
import { EXTERNAL_DEPARTURE_MS, externalDepartureFrames } from "../src/lib/external-departure";

describe("actual destination departure", () => {
  it("finishes quickly without a held full-screen page capture", () => {
    expect(EXTERNAL_DEPARTURE_MS).toBeLessThanOrEqual(300);
    for (const kind of ["scout", "references", "anduril"]) {
      const frames = externalDepartureFrames(kind);
      expect(frames[0]).toMatchObject({ transform: "none", opacity: 1 });
      expect(frames.at(-1)).toMatchObject({ opacity: 0, offset: 1 });
      expect(frames.at(-1)?.transform).toBe("scale(1.18)");
    }
  });
});
