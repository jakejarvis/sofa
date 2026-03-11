import type { Icon } from "@tabler/icons-react-native";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

interface SectionHeaderProps {
  title: string;
  icon?: Icon;
  iconColor?: string;
}

export function SectionHeader({
  title,
  icon: IconComponent,
  iconColor = colors.primary,
}: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      {IconComponent && <IconComponent size={20} color={iconColor} />}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 20,
          color: colors.foreground,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
