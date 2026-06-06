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
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const from = 0;
      const to = value;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) run();
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
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
