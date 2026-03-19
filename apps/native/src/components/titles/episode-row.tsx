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
  onToggle,
  accentColor,
  mutedColor,
}: {
  episodeId: string;
  episodeNumber: number;
  name: string | null;
  airDate: string | null;
  isWatched: boolean;
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
      accessibilityState={{ checked: isWatched }}
      accessibilityLabel={t`Episode ${episodeNumber}, ${episodeLabel}`}
      className="border-border flex-row items-center border-b px-4 py-3"
      style={{ borderBottomWidth: 0.5 }}
    >
      {isWatched ? (
        <ScaledIcon icon={IconCircleCheckFilled} size={22} color={accentColor} />
      ) : (
        <ScaledIcon icon={IconCircleDashed} size={22} color={mutedColor} />
      )}
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
