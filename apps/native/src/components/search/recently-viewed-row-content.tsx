import { useLingui } from "@lingui/react/macro";
import { IconDeviceTvOld, IconMovie, IconUser } from "@tabler/icons-react-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";

import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import type { RecentlyViewedItem } from "@/lib/recently-viewed";

const TypeIcon = {
  movie: IconMovie,
  tv: IconDeviceTvOld,
  person: IconUser,
} as const;

export function RecentlyViewedRowContent({ item }: { item: RecentlyViewedItem }) {
  const { t } = useLingui();
  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;
  const Icon = TypeIcon[item.type];

  const typeLabel: Record<string, string> = {
    movie: t`Movie`,
    tv: t`TV`,
    person: t`Person`,
  };

  const departmentLabels: Record<string, string> = {
    Acting: t`Actor`,
    Directing: t`Director`,
    Writing: t`Writer`,
    Production: t`Producer`,
    Editing: t`Editor`,
  };

  return (
    <View className="flex-row items-center">
      <View
        className="bg-secondary mr-3 overflow-hidden"
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
        <Text numberOfLines={1} className="text-foreground font-sans text-base font-medium">
          {item.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View className="bg-secondary flex-row items-center gap-1 rounded-full px-2 py-0.5">
            <Icon size={12} color={mutedForeground} />
            <Text maxFontSizeMultiplier={1.0} className="text-muted-foreground text-xs">
              {item.type === "person"
                ? departmentLabels[item.subtitle ?? ""]
                : typeLabel[item.type]}
            </Text>
          </View>
          {item.type !== "person" && item.subtitle ? (
            <Text className="text-muted-foreground text-xs">{item.subtitle}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
