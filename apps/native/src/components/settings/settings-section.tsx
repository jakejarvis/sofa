import type { Icon } from "@tabler/icons-react-native";
import type React from "react";
import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";

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
          <View className="rounded-full bg-primary/10 px-2 py-0.5">
            <Text className="font-sans-medium text-[10px] text-primary">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        className="rounded-xl border border-white/[0.06] bg-card px-4"
        style={{ borderCurve: "continuous" }}
      >
        {children}
      </View>
    </View>
  );
}
