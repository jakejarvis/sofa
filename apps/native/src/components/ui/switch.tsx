import { Switch as RNSwitch } from "react-native";
import { useCSSVariable } from "uniwind";

export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const secondaryColor = useCSSVariable("--color-secondary") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const switchScale = process.env.EXPO_OS === "ios" ? 0.84 : 0.9;

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      ios_backgroundColor={secondaryColor}
      thumbColor={process.env.EXPO_OS === "ios" ? undefined : value ? "#fff" : mutedFgColor}
      trackColor={{ false: secondaryColor, true: primaryColor }}
      style={{
        transform: [{ scaleX: switchScale }, { scaleY: switchScale }],
      }}
    />
  );
}
