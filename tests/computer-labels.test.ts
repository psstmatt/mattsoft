import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

describe("self-hosted computer label type", () => {
  it("ships the exact official font bytes with their licenses and provenance", () => {
    const root = new URL("../public/fonts/computer-labels/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("sources.json", root), "utf8"));
    expect(manifest.fonts).toHaveLength(4);
    let bytes = 0;
    for (const font of manifest.fonts) {
      const data = readFileSync(new URL(font.file, root));
      bytes += data.length;
      expect(new URL(font.fontSource).hostname).toBe("fonts.gstatic.com");
      expect(new URL(font.licenseSource).hostname).toBe("raw.githubusercontent.com");
      expect(createHash("sha256").update(data).digest("hex")).toBe(font.sha256);
      expect(readFileSync(new URL(font.licenseFile, root), "utf8")).toContain(
        "SIL OPEN FONT LICENSE",
      );
      expect(data.subarray(0, 4).toString("hex")).toBe("00010000");
    }
    expect(bytes).toBeLessThan(35000);
  });
});
