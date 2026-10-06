import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { msUntilNextLocalMidnight } from "@/lib/local-day";
import { formatLocalDate } from "@sofa/i18n/date-buckets";

/** The current local day (YYYY-MM-DD); updates at midnight and when the app returns to the foreground. */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => formatLocalDate(new Date()));
  useEffect(() => {
    let timer = setTimeout(function tick() {
      setDay(formatLocalDate(new Date()));
      timer = setTimeout(tick, msUntilNextLocalMidnight());
    }, msUntilNextLocalMidnight());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setDay(formatLocalDate(new Date()));
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return day;
}
