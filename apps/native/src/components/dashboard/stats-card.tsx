import { View } from "react-native";

import { Text } from "@/components/ui/text";

export function StatsCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <View
      className="bg-card min-w-[120px] rounded-xl border border-white/[0.06] px-4 py-3"
      style={{ borderCurve: "continuous" }}
    >
      <Text
        className="text-primary font-sans text-2xl font-bold"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value ?? "—"}
      </Text>
      <Text className="text-muted-foreground mt-0.5 text-xs">{label}</Text>
    </View>
  );
}
