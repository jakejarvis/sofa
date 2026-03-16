import type { Icon } from "@tabler/icons-react-native";
import { IconChevronRight } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";

export function SettingsRow({
  label,
  value,
  onPress,
  icon: IconComponent,
  destructive,
  disabled,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: Icon;
  destructive?: boolean;
  disabled?: boolean;
  right?: ReactNode;
}) {
  const destructiveColor = useCSSVariable("--color-destructive") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  const isDisabled = disabled || !onPress;
  const content = (
    <>
      {IconComponent && (
        <ScaledIcon
          icon={IconComponent}
          size={18}
          color={destructive ? destructiveColor : mutedFgColor}
        />
      )}
      <Text
        className={`flex-1 text-base ${destructive ? "text-destructive" : "text-foreground"} ${IconComponent ? "ml-2" : ""}`}
      >
        {label}
      </Text>
      {right}
      {!right && value ? (
        <Text
          selectable={!onPress}
          className="mr-1 max-w-[180px] shrink text-right text-muted-foreground text-sm"
          numberOfLines={2}
        >
          {value}
        </Text>
      ) : null}
      {!right && onPress && (
        <ScaledIcon
          icon={IconChevronRight}
          size={16}
          color={mutedFgColor}
          accessible={false}
        />
      )}
    </>
  );

  if (!onPress) {
    return (
      <View
        className="flex-row items-center py-3.5"
        style={disabled ? { opacity: 0.5 } : undefined}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ disabled: !!isDisabled }}
      className="flex-row items-center py-3.5"
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {content}
    </Pressable>
  );
}
