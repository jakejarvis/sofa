import type { Season } from "@sofa/api/schemas";
import { getNextEpisode } from "@sofa/api/utils";
import { IconPlayerPlay } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "@/components/ui/image";
import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";

export function ContinueWatchingBanner({
  seasons,
  watchedEpisodeIds,
  userStatus,
  backdropPath,
}: {
  seasons: Season[];
  watchedEpisodeIds: Set<string>;
  userStatus: string | null;
  backdropPath: string | null;
}) {
  const { nextEpisode, totalEpisodes, watchedEpisodes } = useMemo(
    () => getNextEpisode(seasons, watchedEpisodeIds),
    [seasons, watchedEpisodeIds],
  );

  if (userStatus !== "in_progress" || !nextEpisode) return null;

  const stillUrl = nextEpisode.stillPath ?? backdropPath ?? null;
  const progress =
    totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(350)}
      className="mt-6 px-4"
    >
      <SectionHeader title="Next Episode" icon={IconPlayerPlay} />
      <View
        className="overflow-hidden rounded-[12px] border bg-card"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderCurve: "continuous",
        }}
      >
        <View className="h-28">
          {stillUrl && (
            <Image
              source={{ uri: stillUrl }}
              className="h-full w-full"
              contentFit="cover"
            />
          )}
          <View
            className="absolute inset-0"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          />
          <View className="absolute right-3 bottom-2.5 left-3">
            <View className="flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-primary" />
              <Text className="font-sans-medium text-[10px] text-primary uppercase tracking-wider">
                Up next
              </Text>
            </View>
            <Text
              numberOfLines={1}
              className="mt-0.5 font-sans-medium text-[13px] text-white"
            >
              <Text className="font-sans-medium text-[11px] text-white/60">
                S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber}
              </Text>
              {"  "}
              {nextEpisode.name}
            </Text>
          </View>
          <View
            className="absolute right-0 bottom-0 left-0 h-[3px]"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <View
              className="h-full bg-status-watching"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
