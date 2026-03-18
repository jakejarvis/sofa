import { useLingui } from "@lingui/react/macro";
import { Pressable } from "react-native";

import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";

export function GenreChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { t } = useLingui();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={
        isSelected ? t`Double tap to clear this filter` : t`Double tap to filter by ${label}`
      }
      className={`mr-2 rounded-full px-3 py-1.5 ${isSelected ? "bg-primary" : "bg-secondary"}`}
    >
      <Text
        className={`font-sans text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
