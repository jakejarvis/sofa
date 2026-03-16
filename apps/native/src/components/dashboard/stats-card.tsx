import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function StatsCard({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <View
      className="min-w-[120px] rounded-xl border border-white/[0.06] bg-card px-4 py-3"
      style={{ borderCurve: "continuous" }}
    >
      <Text
        className="font-bold font-sans text-2xl text-primary"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value ?? "—"}
      </Text>
      <Text className="mt-0.5 text-muted-foreground text-xs">{label}</Text>
    </View>
  );
}
