import { Trans, useLingui } from "@lingui/react/macro";
import type { Season } from "@sofa/api/schemas";
import { getNextEpisode } from "@sofa/api/utils";
import { IconPlayerPlay } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";

export function ContinueWatchingBanner({
  seasons,
  watchedEpisodeIds,
  userStatus,
  backdropPath,
  backdropThumbHash,
}: {
  seasons: Season[];
  watchedEpisodeIds: Set<string>;
  userStatus: string | null;
  backdropPath: string | null;
  backdropThumbHash?: string | null;
}) {
  const { t } = useLingui();
  const titleAccentColor = useCSSVariable("--color-title-accent") as string;

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
      <SectionHeader
        title={t`Next Episode`}
        icon={IconPlayerPlay}
        iconColor={titleAccentColor}
      />
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
              thumbHash={nextEpisode.stillThumbHash ?? backdropThumbHash}
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
              <View className="h-1.5 w-1.5 rounded-full bg-title-accent" />
              <Text
                maxFontSizeMultiplier={1.0}
                className="font-medium font-sans text-title-accent text-xs uppercase tracking-wider"
              >
                <Trans>Up next</Trans>
              </Text>
            </View>
            <Text
              numberOfLines={1}
              className="mt-0.5 font-medium font-sans text-sm text-white"
            >
              <Text className="font-medium font-sans text-white/60 text-xs">
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
              className="h-full bg-title-accent"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
