import { Pressable, Text } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
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
      className="mr-2 rounded-full px-3 py-1.5"
      style={{
        backgroundColor: isSelected ? colors.primary : colors.secondary,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 12,
          color: isSelected ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
