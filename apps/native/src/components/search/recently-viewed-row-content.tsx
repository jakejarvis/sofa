import { IconDeviceTv, IconMovie, IconUser } from "@tabler/icons-react-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import type { RecentlyViewedItem } from "@/lib/recently-viewed";

const TypeIcon = {
  movie: IconMovie,
  tv: IconDeviceTv,
  person: IconUser,
} as const;

const TypeLabel = {
  movie: "Movie",
  tv: "TV",
  person: "Person",
} as const;

export function RecentlyViewedRowContent({
  item,
}: {
  item: RecentlyViewedItem;
}) {
  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;
  const Icon = TypeIcon[item.type];

  return (
    <View className="flex-row items-center">
      <View
        className="mr-3 overflow-hidden bg-secondary"
        style={{
          width: 48,
          height: item.type === "person" ? 48 : 72,
          borderRadius: item.type === "person" ? 24 : 10,
          borderCurve: item.type === "person" ? undefined : "continuous",
        }}
      >
        {item.imagePath ? (
          <Image
            source={{ uri: item.imagePath }}
            className="h-full w-full"
            contentFit="cover"
            recyclingKey={`rv-${item.id}`}
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Icon size={20} color={mutedForeground} />
          </View>
        )}
      </View>
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-medium font-sans text-[15px] text-foreground"
        >
          {item.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View className="rounded-full bg-secondary px-2 py-0.5">
            <Text className="text-[10px] text-muted-foreground">
              {TypeLabel[item.type]}
            </Text>
          </View>
          {item.subtitle ? (
            <Text className="text-muted-foreground text-xs">
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
