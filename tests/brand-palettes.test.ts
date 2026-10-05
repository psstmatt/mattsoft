import { expect, it } from "bun:test";
import { cases, catalog } from "../src/content/site";
import { BRAND_PALETTES, brandIdentity, brandVariables } from "../src/lib/brand-palettes";

it("preserves the five requested brand color pairs, including normalized Expedia navy", () => {
  expect(BRAND_PALETTES.map((palette) => [palette.id, ...palette.colors])).toEqual([
    ["tiktok", "#FE2C55", "#25F4EE"],
    ["meta", "#0082FB", "#0064E0"],
    ["uber", "#000000", "#FFFFFF"],
    ["expedia", "#EEC218", "#00355F"],
    ["boeing", "#0039A6", "#FFFFFF"],
  ]);
});
it("maps actual homepage and catalog employers to the correct identity", () => {
  expect(cases.map((project) => [project.slug, brandIdentity(project.company)])).toEqual([
    ["symphony", "tiktok"],
    ["consent", "meta"],
    ["reserve", "uber"],
    ["deliveries", "boeing"],
  ]);
  expect(catalog.map((group) => brandIdentity(group.company))).toEqual([
    "tiktok",
    "meta",
    "uber",
    "expedia",
    "boeing",
  ]);
  expect(brandIdentity("  TikTok /   ByteDance  ")).toBe("tiktok");
});
it("does not guess brands from project titles or unrelated sidequests", () => {
  for (const unknown of [
    undefined,
    "Metabolic Brewing Co",
    "Tidal House",
    "Uber Reserve",
    "Meta-inspired work",
  ])
    expect(brandIdentity(unknown)).toBe("neutral");
  expect(brandVariables("Metabolic Brewing Co")).toEqual({});
});
it("provides separate light/dark fields and keeps Uber monochrome", () => {
  for (const palette of BRAND_PALETTES) {
    const vars = brandVariables(palette.company);
    expect(Object.keys(vars)).toHaveLength(6);
    expect(vars["--brand-light-a"]).not.toBe(vars["--brand-dark-a"]);
    for (const theme of ["light", "dark"] as const) {
      expect(palette[theme].aPercent).toBeLessThanOrEqual(24);
      expect(palette[theme].bPercent).toBeLessThanOrEqual(70);
    }
  }
  const uber = BRAND_PALETTES.find((palette) => palette.id === "uber")!;
  for (const theme of ["light", "dark"] as const)
    for (const channel of ["a", "b", "border"] as const)
      expect(["#000000", "#FFFFFF"]).toContain(uber[theme][channel]);
});
