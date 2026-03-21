import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react-native";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { titleActions } from "@/lib/title-actions";
import type { UpcomingItem } from "@sofa/api/schemas";

const statusColors = {
  in_watchlist: "--color-status-watchlist",
  watching: "--color-status-watching",
  caught_up: "--color-status-completed",
  completed: "--color-status-completed",
} as const;

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function UpcomingRow({ item }: { item: UpcomingItem }) {
  const { t } = useLingui();
  const statusColor = useCSSVariable(statusColors[item.userStatus]) as string;
  const mutedColor = useCSSVariable("--color-muted-foreground") as string;

  let subtitle: string;
  if (item.titleType === "movie") {
    subtitle = formatShortDate(item.date);
  } else if (item.episodeCount > 1 && item.seasonNumber != null) {
    const seasonNum = item.seasonNumber;
    const epCount = item.episodeCount;
    subtitle = t`S${seasonNum} \u00b7 ${plural(epCount, { one: "# episode", other: "# episodes" })}`;
  } else {
    const episodeLabel =
      item.seasonNumber != null && item.episodeNumber != null
        ? `S${item.seasonNumber} E${item.episodeNumber}`
        : null;
    subtitle = [episodeLabel, item.episodeName].filter(Boolean).join(" \u00b7 ");
  }

  const rowContent = (
    <Pressable className="bg-card/40 flex-row items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-3">
      {/* Poster */}
      <View className="overflow-hidden rounded-lg" style={{ width: 44, height: 66 }}>
        {item.posterPath ? (
          <Image
            source={{ uri: item.posterPath }}
            thumbHash={item.posterThumbHash}
            className="size-full"
            contentFit="cover"
          />
        ) : (
          <View className="bg-muted size-full items-center justify-center">
            <ScaledIcon icon={IconMovie} size={18} color={mutedColor} />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          {/* Status dot with halo */}
          <View className="relative" style={{ width: 8, height: 8 }}>
            <View
              className="absolute inset-0 rounded-full opacity-40"
              style={{ backgroundColor: statusColor }}
            />
            <View className="size-2 rounded-full" style={{ backgroundColor: statusColor }} />
          </View>
          <Text className="text-foreground flex-shrink text-sm font-medium" numberOfLines={1}>
            {item.titleName}
          </Text>
          {item.isNewSeason && (
            <View className="bg-primary/15 rounded px-1.5 py-0.5">
              <Text className="text-primary text-[10px] font-semibold tracking-wider uppercase">
                {t`New Season`}
              </Text>
            </View>
          )}
        </View>
        <View className="mt-1 flex-row items-center gap-1">
          {item.titleType === "movie" && (
            <ScaledIcon icon={IconMovie} size={12} color={mutedColor} />
          )}
          <Text className="text-muted-foreground flex-shrink text-xs" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Right column: date + provider logo */}
      <View className="items-end gap-1">
        <Text className="text-muted-foreground text-xs">{formatShortDate(item.date)}</Text>
        {item.streamingProvider &&
          (item.streamingProvider.logoPath ? (
            <View
              className="overflow-hidden rounded-lg border border-white/[0.06]"
              style={{ width: 28, height: 28 }}
            >
              <Image
                source={{ uri: item.streamingProvider.logoPath }}
                className="size-full"
                contentFit="cover"
              />
            </View>
          ) : (
            <Text className="text-muted-foreground/60 text-[10px]">
              {item.streamingProvider.providerName}
            </Text>
          ))}
      </View>
    </Pressable>
  );

  return (
    <Link href={`/title/${item.titleId}`} asChild>
      <Link.Trigger withAppleZoom>{rowContent}</Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        {item.titleType === "movie" && (
          <Link.MenuAction
            title={t`Mark as Watched`}
            icon="checkmark.circle"
            onPress={() => titleActions.markMovieWatched(item.titleId, item.titleName)}
          />
        )}
        {item.titleType === "tv" && item.episodeId && (
          <Link.MenuAction
            title={t`Mark Episode Watched`}
            icon="checkmark.circle"
            onPress={() => titleActions.watchEpisode(item.episodeId!)}
          />
        )}
        <Link.MenuAction
          title={t`Remove from Library`}
          icon="trash"
          destructive
          onPress={() => titleActions.removeFromLibrary(item.titleId)}
        />
      </Link.Menu>
    </Link>
  );
}
