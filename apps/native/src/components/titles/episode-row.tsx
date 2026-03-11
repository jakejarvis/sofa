import {
  IconCircleCheckFilled,
  IconCircleDashed,
} from "@tabler/icons-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function EpisodeRow({
  episode,
  isWatched,
  onToggle,
}: {
  episode: {
    id: string;
    episodeNumber: number;
    name: string | null;
    airDate: string | null;
  };
  isWatched: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center px-4 py-3"
      style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
    >
      {isWatched ? (
        <IconCircleCheckFilled size={22} color={colors.statusCompleted} />
      ) : (
        <IconCircleDashed size={22} color={colors.mutedForeground} />
      )}
      <View className="ml-3 flex-1">
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 14,
            color: isWatched ? colors.mutedForeground : colors.foreground,
          }}
          numberOfLines={1}
        >
          {episode.episodeNumber}.{" "}
          {episode.name ?? `Episode ${episode.episodeNumber}`}
        </Text>
        {episode.airDate ? (
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            {episode.airDate}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
