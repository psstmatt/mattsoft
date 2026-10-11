import { expect, it } from "bun:test";
import { restoreComputerSurfaces } from "../src/lib/computer-recovery";

it("restores clickable visible cards after a fade cancellation or BFCache return", () => {
  const button = { style: { pointerEvents: "none" } };
  const card = {
    style: { opacity: "0.2" },
    dataset: { entering: "true", ready: "true", kind: "portfolio" },
    querySelector: () => button,
  };
  const dialog = { style: { opacity: "0" } };
  const surface = {
    inert: false,
    style: {
      opacity: "0.8",
      transform: "scale(0.2)",
      transformOrigin: "top",
      clipPath: "inset(40%)",
    },
  };
  restoreComputerSurfaces({
    dialog: dialog as unknown as HTMLElement,
    cards: [null, card as unknown as HTMLElement],
    surface: surface as unknown as HTMLElement,
  });
  expect(button.style.pointerEvents).toBe("");
  expect(card.style.opacity).toBe("");
  expect(card.dataset).toEqual({ kind: "portfolio" });
  expect(dialog.style.opacity).toBe("");
  expect(surface).toEqual({
    inert: true,
    style: { opacity: "", transform: "", transformOrigin: "", clipPath: "" },
  });
});

it("tolerates surfaces removed during interrupted mounting or teardown", () => {
  expect(() =>
    restoreComputerSurfaces({ dialog: null, cards: [null], surface: null }),
  ).not.toThrow();
});
