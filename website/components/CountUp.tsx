"use client";

import { useEffect, useRef, useState } from "react";

export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1400,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  // Track the latest rendered value so a mid-flight value change animates from
  // where we are, not from 0.
  const displayRef = useRef(0);
  // Whether the element has entered the viewport at least once.
  const seen = useRef(false);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  // Re-runs whenever `value` changes. This is what fixes the bug where the stat
  // froze at 0: the old `started` guard blocked re-animation once the async
  // data arrived and the value changed from 0 to the real number.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const animate = () => {
      const start = performance.now();
      const from = displayRef.current;
      const to = value;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setDisplay(from + (to - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Already revealed once (e.g. value updated after data loaded) → animate to
    // the new value immediately.
    if (seen.current) {
      animate();
      return () => cancelAnimationFrame(raf);
    }

    // First time: wait until scrolled into view, then animate.
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            animate();
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const formatted =
    Number.isFinite(display) && display.toFixed
      ? display.toFixed(decimals)
      : "0";

  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
