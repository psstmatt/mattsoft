import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Animates the numeric part of a metric string once when it scrolls into view.
 * Non-numeric values ("#1", "1 tap", "6 wks → 4 days") render as-is.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);
  const match = /^([^\d]*)(\d+(?:\.\d+)?)(.*)$/.exec(value);
  const shouldAnimate = !reduced && !!match;

  useEffect(() => {
    if (!shouldAnimate || !match || !ref.current) return;
    const prefix = match[1] ?? "";
    const num = match[2] ?? "0";
    const suffix = match[3] ?? "";
    const target = parseFloat(num);
    const decimals = num.includes(".") ? (num.split(".")[1]?.length ?? 0) : 0;

    setDisplay(`${prefix}${(0).toFixed(decimals)}${suffix}`);

    const el = ref.current;
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [shouldAnimate, match, value]);

  return (
    <span ref={ref} className={className}>
      {shouldAnimate ? display : value}
    </span>
  );
}
