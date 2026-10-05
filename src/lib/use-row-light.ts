import { useEffect, useRef, type PointerEvent } from "react";
import { lightPosition } from "./row-light";

export function useRowLight() {
  const pending = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (pending.current !== null) cancelAnimationFrame(pending.current);
    },
    [],
  );
  const reset = (element: HTMLElement) => {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
    for (const property of ["--row-x", "--row-y"]) element.style.removeProperty(property);
  };
  return {
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      const element = event.currentTarget,
        x = event.clientX,
        y = event.clientY;
      if (pending.current !== null) cancelAnimationFrame(pending.current);
      pending.current = requestAnimationFrame(() => {
        pending.current = null;
        const values = lightPosition(x, y, element.getBoundingClientRect());
        for (const [key, value] of Object.entries(values)) element.style.setProperty(key, value);
      });
    },
    onPointerLeave(event: PointerEvent<HTMLElement>) {
      reset(event.currentTarget);
    },
    onFocus(event: { currentTarget: HTMLElement }) {
      reset(event.currentTarget);
    },
  };
}
