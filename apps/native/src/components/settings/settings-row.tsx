import type { Icon } from "@tabler/icons-react-native";
import { IconChevronRight } from "@tabler/icons-react-native";
import { Pressable, Text } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function SettingsRow({
  label,
  value,
  onPress,
  icon: IconComponent,
  destructive,
  disabled,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: Icon;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      className="flex-row items-center py-3.5"
      style={[
        { borderBottomWidth: 0.5, borderBottomColor: colors.border },
        disabled ? { opacity: 0.5 } : undefined,
      ]}
    >
      {IconComponent && (
        <IconComponent
          size={20}
          color={destructive ? colors.destructive : colors.mutedForeground}
          style={{ marginRight: 12 }}
        />
      )}
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sans,
          fontSize: 15,
          color: destructive ? colors.destructive : colors.foreground,
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text
          selectable
          style={{
            fontSize: 14,
            color: colors.mutedForeground,
            marginRight: 4,
            maxWidth: 160,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress && <IconChevronRight size={16} color={colors.mutedForeground} />}
    </Pressable>
  );
}
