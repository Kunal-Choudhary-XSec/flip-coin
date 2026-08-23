"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to a unix-seconds target. Ticks 4x per second so the
 * 10s join / 5s flip windows feel responsive.
 */
export function useCountdown(targetUnixSecs: number | null): number {
  const [remaining, setRemaining] = useState(() =>
    targetUnixSecs === null
      ? 0
      : Math.max(0, targetUnixSecs - Math.floor(Date.now() / 1000)),
  );

  useEffect(() => {
    if (targetUnixSecs === null) {
      setRemaining(0);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, targetUnixSecs - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [targetUnixSecs]);

  return remaining;
}
