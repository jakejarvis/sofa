import { useLocation } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type ProgressApi = {
  start: () => void;
  done: () => void;
  set: (pct: number) => void;
};

const ProgressContext = createContext<ProgressApi | null>(null);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { pathname, searchStr } = useLocation();

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

  function start() {
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
    }, 12000);
  }

  function done() {
    if (!inFlightRef.current) return;
    inFlightRef.current = false;
    clearTimers();

    setProgress(100);
    setVisible(true);

    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 200);
  }

  function set(pct: number) {
    const next = clamp(pct, 0, 100);
    if (next >= 100) {
      done();
      return;
    }
    if (!inFlightRef.current) start();
    setProgress(next);
  }

  // Effect events — always see latest closures, don't appear in deps
  const onLinkClick = useEffectEvent((e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

    const anchor = (e.target as Element)?.closest?.("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
    } catch {
      return;
    }

    start();
  });

  const onPopState = useEffectEvent(() => start());

  const onRouteChange = useEffectEvent(() => {
    if (inFlightRef.current) done();
  });

  // Set up listeners once
  useEffect(() => {
    document.addEventListener("click", onLinkClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onLinkClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Finish on route change — routeKey is intentionally a dep to trigger on navigation
  const routeKey = pathname + (searchStr ?? "");
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    onRouteChange();
  }, [routeKey]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(showTimerRef.current);
      clearInterval(trickleTimerRef.current);
      clearTimeout(finishTimerRef.current);
      clearTimeout(safetyTimerRef.current);
    };
  }, []);

  // Stable context API via ref indirection
  const apiRef = useRef<ProgressApi>({ start, done, set });
  apiRef.current = { start, done, set };

  const api = useMemo<ProgressApi>(
    () => ({
      start: () => apiRef.current.start(),
      done: () => apiRef.current.done(),
      set: (pct) => apiRef.current.set(pct),
    }),
    [],
  );

  return (
    <ProgressContext.Provider value={api}>
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
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used inside <ProgressProvider>.");
  }
  return ctx;
}
