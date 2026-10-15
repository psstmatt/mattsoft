import { useEffect } from "react";

/** Document-level siblings: page transitions must never transform these strips. */
export function SafariEdges() {
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    const sync = () => {
      const currentMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      const color = getComputedStyle(root).getPropertyValue("--edge-top-background").trim();
      if (currentMeta && color && currentMeta.content !== color) currentMeta.content = color;
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    // The router may restore its head metadata during navigation.
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    window.addEventListener("pageshow", sync);
    sync();
    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", sync);
      if (meta && previous !== undefined) meta.content = previous;
    };
  }, []);

  return (
    <>
      <div className="edge-top" aria-hidden="true" />
      <div className="edge-bottom" aria-hidden="true" />
    </>
  );
}
