import { readFileSync } from "node:fs";
import { expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RowEffects } from "../src/components/row-effects";
import { ENTRANCE_RAINBOW, rainbowVariables } from "../src/lib/rainbow-aurora";

it("reuses every exact entrance rainbow stop in source order", () => {
  const entrance = readFileSync("src/components/portfolio-experience.css", "utf8");
  const fallback = entrance.split(".portfolio-rainbow::before {")[1]!.split("}\n")[0]!;
  const stops = [...fallback.matchAll(/#[0-9a-f]{6}\b/gi)].map(([hex]) => hex.toUpperCase());
  expect(ENTRANCE_RAINBOW).toEqual(stops);
  expect(Object.values(rainbowVariables)).toEqual(stops);
});

it("renders the shared spectrum on a hidden decorative ancestor of the prism", () => {
  const html = renderToStaticMarkup(createElement(RowEffects));
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('class="rainbow-prism"');
  for (const [variable, color] of Object.entries(rainbowVariables))
    expect(html).toContain(`${variable}:${color}`);
  expect(html).not.toContain("data-brand");
});
