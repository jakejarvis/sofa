import { IconChevronDown } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { EpisodeRow } from "@/components/titles/episode-row";
import { Text } from "@/components/ui/text";
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
  const completedColor = useCSSVariable("--color-status-completed") as string;
  const watchingColor = useCSSVariable("--color-status-watching") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

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
      className="mb-2 overflow-hidden rounded-xl border bg-card"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        borderCurve: "continuous",
      }}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1">
          <Text className="font-sans-medium text-[15px] text-foreground">
            {season.name ?? `Season ${season.seasonNumber}`}
          </Text>
          <Text className="mt-0.5 text-muted-foreground text-xs">
            {watchedCount}/{episodes.length} episodes
          </Text>
        </View>

        <View
          className="mx-3 h-1 w-[60px] overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              backgroundColor: progress === 1 ? completedColor : watchingColor,
            }}
          />
        </View>

        <Animated.View style={chevronStyle}>
          <IconChevronDown size={18} color={mutedFgColor} />
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
              className="mx-4 mb-2 flex-row items-center justify-center rounded-lg bg-secondary py-2"
            >
              <Text className="font-sans-medium text-primary text-xs">
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
