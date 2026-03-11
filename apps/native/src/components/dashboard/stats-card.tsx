import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function StatsCard({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <View
      className="mr-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        borderCurve: "continuous",
        minWidth: 120,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansBold,
          fontSize: 24,
          color: colors.primary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value ?? "—"}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.mutedForeground,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
