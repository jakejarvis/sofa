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
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`mr-2 rounded-full px-3 py-1.5 ${isSelected ? "bg-primary" : "bg-secondary"}`}
    >
      <Text
        className={`font-sans-medium text-[12px] ${isSelected ? "text-primary-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
