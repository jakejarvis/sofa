import { IconChevronDown } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { InteractionManager, Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { EpisodeRow } from "@/components/titles/episode-row";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

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
  const titleAccentColor = useCSSVariable("--color-title-accent") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);
  const watchedCount = episodes.filter((e) =>
    watchedEpisodeIds.has(e.id),
  ).length;
  const progress = episodes.length > 0 ? watchedCount / episodes.length : 0;

  // Progressive rendering: show first batch immediately, defer rest
  const INITIAL_BATCH = 10;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);

  useEffect(() => {
    if (expanded) {
      setVisibleCount(INITIAL_BATCH);
      if (episodes.length > INITIAL_BATCH) {
        const task = InteractionManager.runAfterInteractions(() => {
          setVisibleCount(episodes.length);
        });
        return () => task.cancel();
      }
    }
  }, [expanded, episodes.length]);

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  useEffect(() => {
    chevronRotation.set(
      reduceMotion
        ? expanded
          ? 180
          : 0
        : withTiming(expanded ? 180 : 0, { duration: 200 }),
    );
  }, [expanded, chevronRotation, reduceMotion]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.get()}deg` }],
  }));

  const watchEpisode = useMutation(
    orpc.episodes.watch.mutationOptions({
      onSuccess: (_data, { id: epId }) => {
        const ep = episodes.find((e) => e.id === epId);
        toast.success(
          ep
            ? `Watched S${season.seasonNumber} E${ep.episodeNumber}`
            : "Episode watched",
        );
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to mark episode"),
    }),
  );

  const unwatchEpisode = useMutation(
    orpc.episodes.unwatch.mutationOptions({
      onSuccess: (_data, { id: epId }) => {
        const ep = episodes.find((e) => e.id === epId);
        toast.success(
          ep
            ? `Unwatched S${season.seasonNumber} E${ep.episodeNumber}`
            : "Episode unwatched",
        );
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to unmark episode"),
    }),
  );

  const watchSeason = useMutation(
    orpc.seasons.watch.mutationOptions({
      onSuccess: () => {
        toast.success(
          `Watched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
        );
        queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
      },
      onError: () => toast.error("Failed to mark some episodes"),
    }),
  );

  const handleEpisodeToggle = useCallback(
    (episodeId: string) => {
      if (watchedEpisodeIds.has(episodeId)) {
        unwatchEpisode.mutate({ id: episodeId });
      } else {
        watchEpisode.mutate({ id: episodeId });
      }
    },
    [watchedEpisodeIds, unwatchEpisode, watchEpisode],
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
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${season.name ?? `Season ${season.seasonNumber}`}, ${watchedCount} of ${episodes.length} episodes watched`}
        accessibilityState={{ expanded }}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1">
          <Text className="font-medium font-sans text-base text-foreground">
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
              backgroundColor: titleAccentColor,
            }}
          />
        </View>

        <Animated.View style={chevronStyle}>
          <ScaledIcon icon={IconChevronDown} size={18} color={mutedFgColor} />
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
              <Text className="font-medium font-sans text-title-accent text-xs">
                Mark All Watched
              </Text>
            </Pressable>
          )}

          {episodes.slice(0, visibleCount).map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              isWatched={watchedEpisodeIds.has(episode.id)}
              onToggle={() => handleEpisodeToggle(episode.id)}
              accentColor={titleAccentColor}
              mutedColor={mutedFgColor}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}
