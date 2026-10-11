import { describe, expect, it } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";
import { validateAngleBank } from "../public/experience/konami-angle-bank.js";

for (const model of ["scout-inflatable-angles-v1", "anduril-sonar-angles-v1"]) {
  describe(`${model} published asset closure`, () => {
    it("ships every registered case and glass view with valid non-folded geometry", () => {
      const root = resolve(import.meta.dir, "../public/experience/models", model);
      const bank = validateAngleBank(
        JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8")),
      );
      expect(Object.keys(bank.frames)).toHaveLength(57);
      expect(bank.width).toBe(768);
      expect(bank.topology.uv).toHaveLength(475);
      const assets = new Set<string>();
      for (const frame of Object.values(bank.frames) as { case: string; glass: string }[]) {
        for (const name of [frame.case, frame.glass]) {
          const path = resolve(root, name);
          expect(path.startsWith(root + sep)).toBe(true);
          expect(dirname(path)).toBe(resolve(root, "frames"));
          expect(existsSync(path)).toBe(true);
          const bytes = readFileSync(path);
          expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
          expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
          assets.add(path);
        }
      }
      expect(assets.size).toBe(114);
    });
  });
}
