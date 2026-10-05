import { useLingui } from "@lingui/react/macro";
import { IconCircleCheckFilled, IconCircleDashed } from "@tabler/icons-react-native";
import { memo, useCallback } from "react";
import { Pressable, View } from "react-native";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";

export const EpisodeRow = memo(function EpisodeRow({
  episodeId,
  episodeNumber,
  name,
  airDate,
  isWatched,
  isPending,
  onToggle,
  accentColor,
  mutedColor,
}: {
  episodeId: string;
  episodeNumber: number;
  name: string | null;
  airDate: string | null;
  isWatched: boolean;
  isPending: boolean;
  onToggle: (episodeId: string) => void;
  accentColor: string;
  mutedColor: string;
}) {
  const { t } = useLingui();
  const episodeLabel = name ?? t`Episode ${episodeNumber}`;

  const handleToggle = useCallback(() => onToggle(episodeId), [onToggle, episodeId]);

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="checkbox"
      disabled={isPending}
      accessibilityState={{ checked: isWatched, disabled: isPending }}
      accessibilityLabel={t`Episode ${episodeNumber}, ${episodeLabel}`}
      className="border-border flex-row items-center border-b px-4 py-3"
      style={{ borderBottomWidth: 0.5 }}
    >
      <View style={{ opacity: isPending ? 0.5 : 1 }}>
        {isWatched ? (
          <ScaledIcon icon={IconCircleCheckFilled} size={22} color={accentColor} />
        ) : (
          <ScaledIcon icon={IconCircleDashed} size={22} color={mutedColor} />
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text
          className={`font-sans text-sm font-medium ${isWatched ? "text-muted-foreground" : "text-foreground"}`}
          numberOfLines={1}
        >
          {episodeNumber}. {name ?? t`Episode ${episodeNumber}`}
        </Text>
        {airDate ? <Text className="text-muted-foreground mt-0.5 text-xs">{airDate}</Text> : null}
      </View>
    </Pressable>
  );
});
