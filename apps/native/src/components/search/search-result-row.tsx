import { useLingui } from "@lingui/react/macro";
import { IconLoader, IconPlus } from "@tabler/icons-react-native";
import { Link } from "expo-router";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";

export interface SearchResultItem {
  id?: string;
  title: string;
  type: "movie" | "tv" | "person";
  posterPath?: string | null;
  profilePath?: string | null;
  releaseDate?: string | null;
}

export const SearchResultRow = memo(function SearchResultRow({
  item,
  onQuickAdd,
  isAdding,
}: {
  item: SearchResultItem;
  onQuickAdd: (id: string) => void;
  isAdding: boolean;
}) {
  const { t } = useLingui();
  const primary = useCSSVariable("--color-primary") as string;
  const imageSrc = item.posterPath ?? item.profilePath;

  const typeLabel =
    item.type === "movie"
      ? t`Movie`
      : item.type === "tv"
        ? t`TV show`
        : t`Person`;
  const accessibilityLabel = [
    item.title,
    typeLabel,
    item.releaseDate?.slice(0, 4),
  ]
    .filter(Boolean)
    .join(", ");

  const href = useMemo(() => {
    if (!item.id) return undefined;
    return item.type === "person"
      ? (`/person/${item.id}` as `/person/${string}`)
      : (`/title/${item.id}` as `/title/${string}`);
  }, [item.id, item.type]);

  const rowContent = (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      className="flex-1 flex-row items-center"
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        className="mr-3 overflow-hidden bg-secondary"
        style={{
          width: 44,
          height: item.type === "person" ? 44 : 66,
          borderRadius: item.type === "person" ? 22 : 8,
          borderCurve: item.type === "person" ? undefined : "continuous",
        }}
      >
        {imageSrc ? (
          <Image
            source={{ uri: imageSrc }}
            recyclingKey={imageSrc}
            className="h-full w-full"
            contentFit="cover"
          />
        ) : null}
      </View>

      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-medium font-sans text-base text-foreground"
        >
          {item.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View className="rounded-full bg-secondary px-2 py-0.5">
            <Text
              maxFontSizeMultiplier={1.0}
              className="text-muted-foreground text-xs"
            >
              {item.type === "movie"
                ? t`Movie`
                : item.type === "tv"
                  ? t`TV`
                  : t`Person`}
            </Text>
          </View>
          {item.releaseDate ? (
            <Text className="text-muted-foreground text-xs">
              {item.releaseDate.slice(0, 4)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View
      className="flex-row items-center border-border border-b px-4 py-3"
      style={{
        borderBottomWidth: 0.5,
      }}
    >
      {href ? (
        <Link href={href} asChild>
          {rowContent}
        </Link>
      ) : (
        rowContent
      )}

      {item.type !== "person" && item.id && (
        <Pressable
          onPress={() => onQuickAdd(item.id as string)}
          disabled={isAdding}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.title} to watchlist`}
          hitSlop={12}
          className="ml-2 items-center justify-center self-stretch"
        >
          {isAdding ? (
            <ScaledIcon icon={IconLoader} size={22} color={primary} />
          ) : (
            <ScaledIcon icon={IconPlus} size={22} color={primary} />
          )}
        </Pressable>
      )}
    </View>
  );
});
