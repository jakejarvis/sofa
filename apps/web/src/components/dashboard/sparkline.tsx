import { useEffect, useId, useMemo, useRef, useState } from "react";

interface SparklineProps {
  data: Array<{ bucket: string; count: number }>;
  color: string;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Fritsch-Carlson monotone cubic interpolation.
 * Produces smooth SVG paths that never overshoot between data points.
 */
function computeMonotonePath(
  points: Point[],
  height: number,
): { strokePath: string; areaPath: string } | null {
  const n = points.length;
  if (n < 2) return null;

  const deltas: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    deltas[k] = dx === 0 ? 0 : (points[k + 1].y - points[k].y) / dx;
  }

  const tangents: number[] = Array.from({ length: n });
  tangents[0] = deltas[0];
  tangents[n - 1] = deltas[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (Math.sign(deltas[k - 1]) !== Math.sign(deltas[k])) {
      tangents[k] = 0;
    } else {
      tangents[k] = (deltas[k - 1] + deltas[k]) / 2;
    }
  }

  for (let k = 0; k < n - 1; k++) {
    if (deltas[k] === 0) {
      tangents[k] = 0;
      tangents[k + 1] = 0;
    } else {
      const alpha = tangents[k] / deltas[k];
      const beta = tangents[k + 1] / deltas[k];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangents[k] = tau * alpha * deltas[k];
        tangents[k + 1] = tau * beta * deltas[k];
      }
    }
  }

  let strokePath = `M${points[0].x},${points[0].y}`;
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    const cp1x = points[k].x + dx / 3;
    const cp1y = points[k].y + (tangents[k] * dx) / 3;
    const cp2x = points[k + 1].x - dx / 3;
    const cp2y = points[k + 1].y - (tangents[k + 1] * dx) / 3;
    strokePath += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${points[k + 1].x},${points[k + 1].y}`;
  }

  const areaPath = `${strokePath} L${points[n - 1].x},${height} L${points[0].x},${height} Z`;

  return { strokePath, areaPath };
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
    const points: Point[] = [];
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
