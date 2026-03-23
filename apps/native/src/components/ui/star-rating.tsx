import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconStar, IconStarFilled } from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import * as Haptics from "@/utils/haptics";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  interactive?: boolean;
  accentColor?: string;
}

export function StarRating({
  rating,
  onRate,
  size = 22,
  interactive = true,
  accentColor,
}: StarRatingProps) {
  const { t } = useLingui();
  const [defaultPrimary, mutedForeground] = useCSSVariable([
    "--color-primary",
    "--color-muted-foreground",
  ]) as [string, string];

  const primary = accentColor ?? defaultPrimary;

  return (
    <View
      className="flex-row items-center gap-1"
      accessibilityLabel={t`Rating: ${rating} out of 5 stars`}
      accessibilityRole="adjustable"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel={plural(star, { one: "# star", other: "# stars" })}
          accessibilityHint={
            interactive
              ? star === rating
                ? t`Double tap to clear rating`
                : t`Double tap to rate ${plural(star, { one: "# star", other: "# stars" })}`
              : undefined
          }
          onPress={() => {
            if (!onRate) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRate(star === rating ? 0 : star);
          }}
          hitSlop={10}
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
