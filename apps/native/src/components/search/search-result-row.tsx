import { IconLoader, IconPlus } from "@tabler/icons-react-native";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

export interface SearchResultItem {
  tmdbId: number;
  title: string;
  type: "movie" | "tv" | "person";
  posterPath?: string | null;
  profilePath?: string | null;
  releaseDate?: string | null;
}

export const SearchResultRow = memo(function SearchResultRow({
  item,
  onResolve,
  onQuickAdd,
  isResolving,
  isAdding,
}: {
  item: SearchResultItem;
  onResolve: (item: SearchResultItem) => void;
  onQuickAdd: (tmdbId: number, type: "movie" | "tv") => void;
  isResolving: boolean;
  isAdding: boolean;
}) {
  const primary = useCSSVariable("--color-primary") as string;
  const imageSrc = item.posterPath ?? item.profilePath;

  return (
    <Pressable
      onPress={() => onResolve(item)}
      disabled={isResolving}
      className="flex-row items-center border-border border-b px-4 py-3"
      style={{
        borderBottomWidth: 0.5,
        opacity: isResolving ? 0.6 : 1,
      }}
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
            className="h-full w-full"
            contentFit="cover"
          />
        ) : null}
      </View>

      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-sans-medium text-[15px] text-foreground"
        >
          {item.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View className="rounded-full bg-secondary px-2 py-0.5">
            <Text className="text-[10px] text-muted-foreground">
              {item.type === "movie"
                ? "Movie"
                : item.type === "tv"
                  ? "TV"
                  : "Person"}
            </Text>
          </View>
          {item.releaseDate ? (
            <Text className="text-muted-foreground text-xs">
              {item.releaseDate.slice(0, 4)}
            </Text>
          ) : null}
        </View>
      </View>

      {item.type !== "person" && (
        <Pressable
          onPress={() => onQuickAdd(item.tmdbId, item.type as "movie" | "tv")}
          disabled={isAdding}
          hitSlop={8}
          className="ml-2"
        >
          {isAdding ? (
            <IconLoader size={22} color={primary} />
          ) : (
            <IconPlus size={22} color={primary} />
          )}
        </Pressable>
      )}

      {isResolving && (
        <Spinner size="sm" colorClassName="accent-primary" className="ml-2" />
      )}
    </Pressable>
  );
});
