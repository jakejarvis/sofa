import { useId, useMemo } from "react";
import { useCallback, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

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

  // Step 1: compute secants between adjacent points
  const deltas: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    deltas[k] = dx === 0 ? 0 : (points[k + 1].y - points[k].y) / dx;
  }

  // Step 2: compute initial tangent slopes
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

  // Step 3: Fritsch-Carlson monotonicity fix
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

  // Step 4: build SVG path with cubic Bezier segments
  let strokePath = `M${points[0].x},${points[0].y}`;
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    const cp1x = points[k].x + dx / 3;
    const cp1y = points[k].y + (tangents[k] * dx) / 3;
    const cp2x = points[k + 1].x - dx / 3;
    const cp2y = points[k + 1].y - (tangents[k + 1] * dx) / 3;
    strokePath += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${points[k + 1].x},${points[k + 1].y}`;
  }

  // Close the area path along the bottom edge
  const areaPath = `${strokePath} L${points[n - 1].x},${height} L${points[0].x},${height} Z`;

  return { strokePath, areaPath };
}

export function Sparkline({ data, color }: SparklineProps) {
  const uniqueId = useId();
  const gradientId = `sparkline-${uniqueId.replace(/:/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  }, []);

  const paths = useMemo(() => {
    if (!data.some((d) => d.count > 0)) return null;
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

  if (!data.some((d) => d.count > 0)) return null;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={handleLayout} pointerEvents="none">
      {paths && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2={String(size.height)}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={color} stopOpacity={0.08} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={paths.areaPath} fill={`url(#${gradientId})`} />
          <Path
            d={paths.strokePath}
            fill="none"
            stroke={color}
            strokeWidth={1}
            strokeOpacity={0.15}
          />
        </Svg>
      )}
    </View>
  );
}
