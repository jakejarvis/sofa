import {
  IconCircleCheckFilled,
  IconCircleDashed,
} from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
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
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center border-border border-b px-4 py-3"
      style={{ borderBottomWidth: 0.5 }}
    >
      {isWatched ? (
        <IconCircleCheckFilled size={22} color={accentColor} />
      ) : (
        <IconCircleDashed size={22} color={mutedColor} />
      )}
      <View className="ml-3 flex-1">
        <Text
          className={`font-sans-medium text-sm ${isWatched ? "text-muted-foreground" : "text-foreground"}`}
          numberOfLines={1}
        >
          {episode.episodeNumber}.{" "}
          {episode.name ?? `Episode ${episode.episodeNumber}`}
        </Text>
        {episode.airDate ? (
          <Text className="mt-0.5 text-[11px] text-muted-foreground">
            {episode.airDate}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
