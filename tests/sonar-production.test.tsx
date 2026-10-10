import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { SecretComputerDeck } from "../src/components/secret-computer-deck";
import { screenSourceForViewport } from "../public/experience/konami-screen-source.js";

const props = { surface: { current: null }, onComplete() {} };
const renderDeck = () => renderToStaticMarkup(createElement(SecretComputerDeck, props));

describe("production Sonar deck", () => {
  it("renders four destinations while keeping the three secret cards locked", () => {
    const html = renderDeck();
    const cards = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(([card]) => card);
    expect(cards).toHaveLength(4);
    for (const [index, kind] of ["portfolio", "scout", "references", "anduril"].entries()) {
      expect(cards[index]).toContain(`data-kind="${kind}"`);
      expect(cards[index].includes('inert=""')).toBe(index !== 0);
    }
    expect(html).toContain('data-unlocked="false"');
    expect(html).toContain('aria-label="Enter Anduril"');
    expect(html).not.toContain('aria-label="Secret computers"');
  });

  it("cannot unlock or show replay controls through former prototype props", () => {
    const legacyReviewProps = {
      ...props,
      reviewDeck: true,
      initialMachine: 3,
      replayStudy: true,
      entryMotion: "standard",
      look: "playful",
    };
    expect(renderToStaticMarkup(createElement(SecretComputerDeck, legacyReviewProps))).toBe(
      renderDeck(),
    );
  });

  it("gives every numberless caption an accessible destination name and fixes Sonar to Echo", () => {
    const html = renderDeck();
    const captions = [
      ...html.matchAll(/<div class="secret-computer-label[^>]*>([\s\S]*?)<\/div>/g),
    ];
    expect(captions).toHaveLength(4);
    for (const [index, label] of ["Portfolio", "Scout", "References", "Anduril"].entries()) {
      expect(captions[index][1]).toMatch(/^<h2\b/);
      expect(captions[index][1]).toContain(`aria-label="${label}"`);
    }
    expect(html).toContain('class="secret-computer-label sonar-caption" data-sonar-type="echo"');
    expect(html).toContain('data-focus-style="tidal"');
  });

  it("selects the portrait capture only for a narrow Anduril viewport", () => {
    for (const width of [320, 390, 700])
      expect(screenSourceForViewport("anduril", width)).toBe(
        "/previews/anduril-descent-portrait.jpg",
      );
    for (const width of [701, 1200, 1920])
      expect(screenSourceForViewport("anduril", width)).toBe("/previews/anduril-descent.jpg");
    for (const width of [320, 700, 701, 1920]) {
      expect(screenSourceForViewport("scout", width)).toBe("/previews/scout-header-only.jpg");
      expect(screenSourceForViewport("references", width)).toBe("/previews/references-tall.jpg");
    }
  });

  it("ships the reviewed Echo font bytes with their license", () => {
    const root = new URL("../public/fonts/sonar-labels/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("sources.json", root), "utf8"));
    expect(manifest.fonts).toHaveLength(1);
    const [font] = manifest.fonts;
    expect(font.family).toBe("Unbounded");
    const data = readFileSync(new URL(font.file, root));
    expect(createHash("sha256").update(data).digest("hex")).toBe(font.sha256);
    expect(readFileSync(new URL(font.licenseFile, root), "utf8")).toContain(
      "SIL OPEN FONT LICENSE",
    );
  });
});
