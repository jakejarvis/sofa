import type { Icon } from "@tabler/icons-react-native";
import { IconChevronRight } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { useCSSVariable } from "uniwind";
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

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      className="flex-row items-center py-3.5"
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {IconComponent && (
        <IconComponent
          size={18}
          color={destructive ? destructiveColor : mutedFgColor}
        />
      )}
      <Text
        className={`flex-1 text-[15px] ${destructive ? "text-destructive" : "text-foreground"} ${IconComponent ? "ml-2" : ""}`}
      >
        {label}
      </Text>
      {right}
      {!right && value ? (
        <Text
          selectable
          className="mr-1 max-w-[160px] text-[14px] text-muted-foreground"
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {!right && onPress && <IconChevronRight size={16} color={mutedFgColor} />}
    </Pressable>
  );
}
