import { useId, useMemo } from "react";
import { useCallback, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { computeMonotonePath, type SparklinePoint } from "@sofa/api/utils";

interface SparklineProps {
  data: Array<{ bucket: string; count: number }>;
  color: string;
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
    const points: SparklinePoint[] = [];
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
