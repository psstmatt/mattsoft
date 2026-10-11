/** Leave the rendered machine quickly; never enlarge a cached page into a fake landing page. */
export const EXTERNAL_DEPARTURE_MS = 280;

export function externalDepartureFrames(kind: string): Keyframe[] {
  const squash = kind === "scout" ? "scale(1.025,.975)" : "scale(.99)";
  return [
    { transform: "none", opacity: 1, offset: 0 },
    { transform: squash, opacity: 1, offset: 0.2 },
    { transform: "scale(1.18)", opacity: 0, offset: 1 },
  ];
}

export function prepareDestinationConnection(url: string, document: Document) {
  const origin = new URL(url).origin;
  if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  document.head.append(link);
}
