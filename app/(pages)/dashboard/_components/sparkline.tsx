"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: Array<{ bucket: string; count: number }>;
  color: string;
}

export function Sparkline({ data, color }: SparklineProps) {
  const uniqueId = useId();
  const gradientId = `sparkline-${uniqueId.replace(/:/g, "")}`;

  if (!data.some((d) => d.count > 0)) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${color}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.08} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, "auto"]} hide />
          <Area
            type="monotone"
            dataKey="count"
            stroke="currentColor"
            strokeWidth={1}
            strokeOpacity={0.15}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
