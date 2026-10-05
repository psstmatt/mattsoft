import type { CSSProperties } from "react";

// Exact stops from .portfolio-rainbow::before in the production entrance.
// The WebGL overlay is a continuous OKLab spectrum, not a fixed hex palette.
export const ENTRANCE_RAINBOW = [
  "#E56F9A",
  "#EBB557",
  "#64C4A6",
  "#58B4E9",
  "#9182E4",
  "#DF80B5",
] as const;

export const rainbowVariables: CSSProperties & Record<string, string> = Object.fromEntries(
  ENTRANCE_RAINBOW.map((color, i) => [`--entrance-${i + 1}`, color]),
);
