import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useEffectEvent, useState } from "react";

function toTimestamp(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Number.isFinite(t) ? t : null;
}

export function useTimeAgo(
  date: string | Date | null | undefined,
  { intervalMs = 1_000, addSuffix = true, fallback = "" } = {},
): string {
  const ts = toTimestamp(date);

  const [text, setText] = useState(() =>
    ts === null ? fallback : formatDistanceToNowStrict(ts, { addSuffix }),
  );

  const tick = useEffectEvent(() => {
    const next =
      ts === null ? fallback : formatDistanceToNowStrict(ts, { addSuffix });
    if (next !== text) setText(next);
  });

  useEffect(() => {
    tick();
    if (ts === null) return;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [ts, intervalMs]); // tick is NOT listed — that's the point

  return text;
}
