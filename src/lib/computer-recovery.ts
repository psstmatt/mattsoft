/** Clear presentation left by either an aborted entry or a restored page. */
export function restoreComputerSurfaces({
  dialog,
  cards,
  surface,
}: {
  dialog: HTMLElement | null;
  cards: readonly (HTMLElement | null)[];
  surface: HTMLElement | null;
}) {
  if (dialog) dialog.style.opacity = "";
  if (surface) {
    surface.inert = true;
    Object.assign(surface.style, {
      transform: "",
      transformOrigin: "",
      clipPath: "",
      opacity: "",
    });
  }
  for (const card of cards) {
    if (!card) continue;
    card.style.opacity = "";
    delete card.dataset["entering"];
    delete card.dataset["ready"];
    const button = card.querySelector<HTMLButtonElement>("[data-computer-enter]");
    if (button) button.style.pointerEvents = "";
  }
}
