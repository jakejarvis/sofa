import { useEffect, useId, useMemo, useRef, useState } from "react";

import { computeMonotonePath, type SparklinePoint } from "@sofa/api/utils";

interface SparklineProps {
  data: Array<{ bucket: string; count: number }>;
  color: string;
}

export function Sparkline({ data, color }: SparklineProps) {
  const uniqueId = useId();
  const gradientId = `sparkline-${uniqueId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paths = useMemo(() => {
    if (size.width === 0 || size.height === 0) return null;

    const counts = data.map((d) => d.count);
    const maxCount = Math.max(...counts);
    if (maxCount === 0) return null;

    const n = data.length;
    const topPadding = size.height * 0.05;
    const points: SparklinePoint[] = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? size.width / 2 : (i / (n - 1)) * size.width;
      const y = topPadding + (1 - counts[i] / maxCount) * (size.height - topPadding);
      points.push({ x, y });
    }

    return computeMonotonePath(points, size.height);
  }, [data, size.width, size.height]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${color}`}
    >
      {paths && (
        <svg width={size.width} height={size.height}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.08} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={paths.areaPath} fill={`url(#${gradientId})`} />
          <path
            d={paths.strokePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeOpacity={0.15}
          />
        </svg>
      )}
    </div>
  );
}
