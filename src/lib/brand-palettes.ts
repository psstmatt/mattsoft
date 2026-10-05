import type { CSSProperties } from "react";

type Tone = {
  a: string;
  b: string;
  aPercent: number;
  bPercent: number;
  border: string;
  borderPercent: number;
};
export type BrandPalette = {
  id: string;
  company: string;
  label: string;
  colors: readonly [string, string];
  description: string;
  light: Tone;
  dark: Tone;
};
const tint = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${100 - amount}%, #FFFFFF ${amount}%)`;
export const BRAND_PALETTES: readonly BrandPalette[] = [
  {
    id: "tiktok",
    company: "TikTok / ByteDance",
    label: "TikTok",
    colors: ["#FE2C55", "#25F4EE"],
    description:
      "Cyan leads on dark, with red as a soft counter-light. Both are dialed back on paper.",
    light: {
      a: "#FE2C55",
      b: "#25F4EE",
      aPercent: 10,
      bPercent: 13,
      border: "#FE2C55",
      borderPercent: 18,
    },
    dark: {
      a: "#25F4EE",
      b: "#FE2C55",
      aPercent: 16,
      bPercent: 13,
      border: "#25F4EE",
      borderPercent: 27,
    },
  },
  {
    id: "meta",
    company: "Meta",
    label: "Meta",
    colors: ["#0082FB", "#0064E0"],
    description:
      "A cool, continuous blue halo. A little lifted light keeps the dark version from disappearing.",
    light: {
      a: "#0082FB",
      b: "#0064E0",
      aPercent: 12,
      bPercent: 7,
      border: "#0082FB",
      borderPercent: 23,
    },
    dark: {
      a: tint("#0082FB", 18),
      b: "#0064E0",
      aPercent: 24,
      bPercent: 17,
      border: tint("#0082FB", 18),
      borderPercent: 34,
    },
  },
  {
    id: "uber",
    company: "Uber",
    label: "Uber",
    colors: ["#000000", "#FFFFFF"],
    description:
      "Ink on paper in light mode; a soft white reflection over charcoal in dark. Completely monochrome.",
    light: {
      a: "#000000",
      b: "#FFFFFF",
      aPercent: 7,
      bPercent: 70,
      border: "#000000",
      borderPercent: 16,
    },
    dark: {
      a: "#FFFFFF",
      b: "#000000",
      aPercent: 10,
      bPercent: 38,
      border: "#FFFFFF",
      borderPercent: 20,
    },
  },
  {
    id: "expedia",
    company: "Expedia",
    label: "Expedia",
    colors: ["#EEC218", "#00355F"],
    description:
      "Gold provides the warmth; navy gives it depth. The yellow stays luminous without becoming a solid slab.",
    light: {
      a: "#EEC218",
      b: "#00355F",
      aPercent: 16,
      bPercent: 6,
      border: "#B68F10",
      borderPercent: 27,
    },
    dark: {
      a: "#EEC218",
      b: tint("#00355F", 24),
      aPercent: 18,
      bPercent: 13,
      border: "#EEC218",
      borderPercent: 28,
    },
  },
  {
    id: "boeing",
    company: "Boeing",
    label: "Boeing",
    colors: ["#0039A6", "#FFFFFF"],
    description:
      "A deeper cobalt than Meta, balanced with a small white highlight. Crisp and quieter than the two-color glow.",
    light: {
      a: "#0039A6",
      b: "#FFFFFF",
      aPercent: 11,
      bPercent: 68,
      border: "#0039A6",
      borderPercent: 22,
    },
    dark: {
      a: tint("#0039A6", 22),
      b: "#FFFFFF",
      aPercent: 24,
      bPercent: 8,
      border: tint("#0039A6", 22),
      borderPercent: 32,
    },
  },
];

export function brandPalette(company?: string) {
  const key = (company ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (["tiktok", "bytedance", "tiktok / bytedance"].includes(key)) return BRAND_PALETTES[0];
  return BRAND_PALETTES.find((palette) => palette.company.toLowerCase() === key);
}

export function brandIdentity(company?: string) {
  return brandPalette(company)?.id ?? "neutral";
}

export function brandVariables(company?: string): CSSProperties & Record<string, string> {
  const palette = brandPalette(company);
  if (!palette) return {};
  const values: Record<string, string> = {};
  for (const theme of ["light", "dark"] as const) {
    const tone = palette[theme];
    values[`--brand-${theme}-a`] = `color-mix(in srgb, ${tone.a} ${tone.aPercent}%, transparent)`;
    values[`--brand-${theme}-b`] = `color-mix(in srgb, ${tone.b} ${tone.bPercent}%, transparent)`;
    values[`--brand-${theme}-border`] =
      `color-mix(in srgb, ${tone.border} ${tone.borderPercent}%, transparent)`;
  }
  return values;
}
