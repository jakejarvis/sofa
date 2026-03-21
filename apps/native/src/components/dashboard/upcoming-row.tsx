import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react-native";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import type { UpcomingItem } from "@sofa/api/schemas";
import { formatDate } from "@sofa/i18n/format";

const statusColors = {
  in_watchlist: "--color-status-watchlist",
  watching: "--color-status-watching",
  caught_up: "--color-status-completed",
  completed: "--color-status-completed",
} as const;

function formatShortDate(dateStr: string): string {
  return formatDate(dateStr, { month: "short", day: "numeric" });
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
        ? `S${item.seasonNumber}E${item.episodeNumber}`
        : null;
    subtitle = [episodeLabel, item.episodeName].filter(Boolean).join(" \u00b7 ");
  }

  return (
    <Link href={`/title/${item.titleId}`} asChild>
      <Pressable className="flex-row items-center gap-3 px-4 py-2.5">
        {/* Poster thumbnail */}
        <View className="overflow-hidden rounded-md" style={{ width: 44, height: 44 }}>
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
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-shrink text-sm font-medium" numberOfLines={1}>
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
          <View className="mt-0.5 flex-row items-center gap-1">
            {item.titleType === "movie" && (
              <ScaledIcon icon={IconMovie} size={12} color={mutedColor} />
            )}
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>
              {subtitle}
            </Text>
            {item.streamingProvider && (
              <>
                <Text className="text-muted-foreground/40 text-xs"> &middot; </Text>
                <Text className="text-muted-foreground text-xs">
                  {item.streamingProvider.providerName}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Status dot + date */}
        <View className="items-end gap-1">
          <View className="size-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <Text className="text-muted-foreground/60 text-[10px] font-medium">
            {formatShortDate(item.date)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
