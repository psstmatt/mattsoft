/** The reviewed keyboard-focus treatment for each destination. */
export const COMPUTER_FOCUS = Object.freeze({
  portfolio: "stage",
  scout: "halo",
  references: "spotlight",
} as const);

type FocusOwner = { focus: (options?: FocusOptions) => void };
type FocusCard = { contains: (node: Node | null) => boolean };

/** Retire a screen's keyboard focus on pointer/touch selection without stealing
 * focus from carousel controls or any element outside that screen's card. */
export function releaseComputerFocus(
  card: FocusCard | null | undefined,
  activeElement: Node | null,
  dialog: FocusOwner | null | undefined,
): boolean {
  if (!activeElement || !dialog || !card?.contains(activeElement)) return false;
  dialog.focus({ preventScroll: true });
  return true;
}
