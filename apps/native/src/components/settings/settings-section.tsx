import type { Icon } from "@tabler/icons-react-native";
import type React from "react";
import { Text, View } from "react-native";

import { SectionHeader } from "@/components/ui/section-header";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function SettingsSection({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: Icon;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center gap-2">
        <SectionHeader title={title} icon={icon} />
        {badge ? (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Text
              style={{
                fontSize: 10,
                color: colors.primary,
                fontFamily: fonts.sansMedium,
              }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        className="rounded-xl px-4"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          borderCurve: "continuous",
        }}
      >
        {children}
      </View>
    </View>
  );
}
