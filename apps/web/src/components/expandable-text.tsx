import { Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  /** Tailwind line-clamp class applied when collapsed (default: "line-clamp-3") */
  clampClass?: string;
  className?: string;
  textClassName?: string;
}

export function ExpandableText({
  text,
  clampClass = "line-clamp-3",
  className,
  textClassName,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      <p
        ref={ref}
        className={cn(
          "text-muted-foreground leading-relaxed break-words",
          !expanded && clampClass,
          textClassName,
        )}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-primary hover:text-primary/80 mt-1 text-xs font-medium transition-colors"
        >
          {expanded ? <Trans>Show less</Trans> : <Trans>Read more</Trans>}
        </button>
      )}
    </div>
  );
}
