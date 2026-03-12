import type { Icon } from "@tabler/icons-react-native";
import { IconChevronRight } from "@tabler/icons-react-native";
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
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: Icon;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const destructiveColor = useCSSVariable("--color-destructive") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      className="flex-row items-center border-border border-b py-3.5"
      style={[
        { borderBottomWidth: 0.5 },
        disabled ? { opacity: 0.5 } : undefined,
      ]}
    >
      {IconComponent && (
        <IconComponent
          size={20}
          color={destructive ? destructiveColor : mutedFgColor}
          className="mr-3"
        />
      )}
      <Text
        className={`flex-1 text-[15px] ${destructive ? "text-destructive" : "text-foreground"}`}
      >
        {label}
      </Text>
      {value ? (
        <Text
          selectable
          className="mr-1 max-w-[160px] text-[14px] text-muted-foreground"
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress && <IconChevronRight size={16} color={mutedFgColor} />}
    </Pressable>
  );
}
