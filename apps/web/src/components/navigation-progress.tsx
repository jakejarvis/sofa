import { useRouter } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function NavigationProgress() {
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const inFlightRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const trickleTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function clearTimers() {
    clearTimeout(showTimerRef.current);
    clearInterval(trickleTimerRef.current);
    clearTimeout(finishTimerRef.current);
    clearTimeout(safetyTimerRef.current);
  }

  const start = useEffectEvent(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    clearTimers();

    // Delay showing to avoid flash on instant (prefetched) navigations
    showTimerRef.current = setTimeout(() => {
      setVisible(true);
      setProgress(8);

      trickleTimerRef.current = setInterval(() => {
        setProgress((p) => {
          if (!inFlightRef.current) return p;
          return clamp(p + Math.max(0.5, (90 - p) * 0.08), 0, 90);
        });
      }, 200);
    }, 100);

    // Safety timeout to prevent stuck bar
    safetyTimerRef.current = setTimeout(() => {
      inFlightRef.current = false;
      clearTimers();
      setVisible(false);
      setProgress(0);
    }, 12_000);
  });

  const done = useEffectEvent(() => {
    if (!inFlightRef.current) return;
    inFlightRef.current = false;
    clearTimers();

    setProgress(100);
    setVisible(true);

    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 200);
  });

  // Subscribe to TanStack Router navigation lifecycle events
  useEffect(() => {
    const unsubBeforeLoad = router.subscribe("onBeforeLoad", (event) => {
      if (event.pathChanged) start();
    });
    const unsubResolved = router.subscribe("onResolved", () => done());
    return () => {
      unsubBeforeLoad();
      unsubResolved();
    };
  }, [router]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(showTimerRef.current);
      clearInterval(trickleTimerRef.current);
      clearTimeout(finishTimerRef.current);
      clearTimeout(safetyTimerRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-0.5 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className={`bg-primary h-full origin-left motion-safe:[box-shadow:0_0_8px_var(--color-primary)] ${progress === 0 ? "" : "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"}`}
        style={{ transform: `scaleX(${clamp(progress, 0, 100) / 100})` }}
      />
    </div>
  );
}
