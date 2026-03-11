import { IconChevronDown } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { EpisodeRow } from "@/components/titles/episode-row";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

export function SeasonAccordion({
  season,
  episodes,
  watchedEpisodeIds,
}: {
  season: {
    id: string;
    seasonNumber: number;
    name: string | null;
  };
  episodes: Array<{
    id: string;
    episodeNumber: number;
    name: string | null;
    airDate: string | null;
  }>;
  watchedEpisodeIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);
  const watchedCount = episodes.filter((e) =>
    watchedEpisodeIds.has(e.id),
  ).length;
  const progress = episodes.length > 0 ? watchedCount / episodes.length : 0;

  useEffect(() => {
    chevronRotation.set(withTiming(expanded ? 180 : 0, { duration: 200 }));
  }, [expanded, chevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.get()}deg` }],
  }));

  const watchEpisode = useMutation(
    orpc.episodes.watch.mutationOptions({
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  const unwatchEpisode = useMutation(
    orpc.episodes.unwatch.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  const watchSeason = useMutation(
    orpc.seasons.watch.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
    }),
  );

  return (
    <View
      className="mb-2 overflow-hidden rounded-xl"
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        borderCurve: "continuous",
      }}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1">
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: colors.foreground,
            }}
          >
            {season.name ?? `Season ${season.seasonNumber}`}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            {watchedCount}/{episodes.length} episodes
          </Text>
        </View>

        <View
          className="mx-3 overflow-hidden rounded-full"
          style={{
            width: 60,
            height: 4,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              backgroundColor:
                progress === 1 ? colors.statusCompleted : colors.statusWatching,
            }}
          />
        </View>

        <Animated.View style={chevronStyle}>
          <IconChevronDown size={18} color={colors.mutedForeground} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          {watchedCount < episodes.length && (
            <Pressable
              onPress={() => watchSeason.mutate({ id: season.id })}
              className="mx-4 mb-2 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: colors.secondary }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  fontFamily: fonts.sansMedium,
                }}
              >
                Mark All Watched
              </Text>
            </Pressable>
          )}

          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              isWatched={watchedEpisodeIds.has(episode.id)}
              onToggle={() => {
                if (watchedEpisodeIds.has(episode.id)) {
                  unwatchEpisode.mutate({ id: episode.id });
                } else {
                  watchEpisode.mutate({ id: episode.id });
                }
              }}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}
