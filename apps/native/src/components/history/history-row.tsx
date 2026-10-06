import { useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react-native";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import type { z } from "zod";

import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { formatLocalTimeOfDay } from "@/lib/format-time";
import type { WatchHistoryItemSchema } from "@sofa/api/schemas";

type WatchHistoryItem = z.infer<typeof WatchHistoryItemSchema>;

export function HistoryRow({ item }: { item: WatchHistoryItem }) {
  const { t } = useLingui();
  const mutedColor = useCSSVariable("--color-muted-foreground") as string;

  const sourceLabels = {
    manual: t`Manual`,
    import: t`Import`,
    plex: t`Plex`,
    jellyfin: t`Jellyfin`,
    emby: t`Emby`,
  } as const;

  let subtitle: string | null = null;
  if (item.episode) {
    const season = item.episode.seasonNumber;
    const episode = item.episode.episodeNumber;
    const name = item.episode.name;
    subtitle = name ? t`S${season} E${episode} · ${name}` : t`S${season} E${episode}`;
  }

  const time = formatLocalTimeOfDay(new Date(item.watchedAt));
  const accessibilityLabel = [item.title.title, subtitle, time].filter(Boolean).join(", ");

  return (
    <Link href={`/title/${item.title.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel}
        className="bg-card/40 flex-row items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-3"
      >
        <View className="overflow-hidden rounded-lg" style={{ width: 44, height: 66 }}>
          {item.title.posterPath ? (
            <Image
              source={{ uri: item.title.posterPath }}
              thumbHash={item.title.posterThumbHash}
              className="size-full"
              contentFit="cover"
            />
          ) : (
            <View className="bg-muted size-full items-center justify-center">
              <ScaledIcon icon={IconMovie} size={18} color={mutedColor} />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-foreground text-sm font-medium" numberOfLines={1}>
            {item.title.title}
          </Text>
          {subtitle && (
            <Text className="text-muted-foreground mt-1 text-xs" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View className="items-end gap-1">
          <Text className="text-muted-foreground text-xs">{time}</Text>
          <View className="bg-muted rounded px-1.5 py-0.5">
            <Text className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {sourceLabels[item.source]}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
