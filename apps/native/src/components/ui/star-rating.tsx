import { IconStar, IconStarFilled } from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import * as Haptics from "@/utils/haptics";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  interactive?: boolean;
}

export function StarRating({
  rating,
  onRate,
  size = 22,
  interactive = true,
}: StarRatingProps) {
  const [primary, mutedForeground] = useCSSVariable([
    "--color-primary",
    "--color-muted-foreground",
  ]) as [string, string];

  return (
    <View className="flex-row items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={!interactive}
          onPress={() => {
            if (!onRate) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRate(star === rating ? 0 : star);
          }}
          hitSlop={6}
        >
          {star <= rating ? (
            <IconStarFilled size={size} color={primary} />
          ) : (
            <IconStar size={size} color={mutedForeground} />
          )}
        </Pressable>
      ))}
    </View>
  );
}
