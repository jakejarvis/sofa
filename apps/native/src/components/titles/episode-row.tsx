import { useLingui } from "@lingui/react/macro";
import {
  IconCircleCheckFilled,
  IconCircleDashed,
} from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";

export function EpisodeRow({
  episode,
  isWatched,
  onToggle,
  accentColor,
  mutedColor,
}: {
  episode: {
    id: string;
    episodeNumber: number;
    name: string | null;
    airDate: string | null;
  };
  isWatched: boolean;
  onToggle: () => void;
  accentColor: string;
  mutedColor: string;
}) {
  const { t } = useLingui();
  const episodeLabel = episode.name ?? t`Episode ${episode.episodeNumber}`;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isWatched }}
      accessibilityLabel={t`Episode ${episode.episodeNumber}, ${episodeLabel}`}
      className="flex-row items-center border-border border-b px-4 py-3"
      style={{ borderBottomWidth: 0.5 }}
    >
      {isWatched ? (
        <ScaledIcon
          icon={IconCircleCheckFilled}
          size={22}
          color={accentColor}
        />
      ) : (
        <ScaledIcon icon={IconCircleDashed} size={22} color={mutedColor} />
      )}
      <View className="ml-3 flex-1">
        <Text
          className={`font-medium font-sans text-sm ${isWatched ? "text-muted-foreground" : "text-foreground"}`}
          numberOfLines={1}
        >
          {episode.episodeNumber}.{" "}
          {episode.name ?? t`Episode ${episode.episodeNumber}`}
        </Text>
        {episode.airDate ? (
          <Text className="mt-0.5 text-muted-foreground text-xs">
            {episode.airDate}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
