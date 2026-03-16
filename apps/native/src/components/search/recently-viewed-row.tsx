import { memo } from "react";
import { Pressable } from "react-native";
import { RecentlyViewedRowContent } from "@/components/search/recently-viewed-row-content";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import type { RecentlyViewedItem } from "@/lib/recently-viewed";

export const RecentlyViewedRow = memo(function RecentlyViewedRow({
  item,
  onPress,
  onDelete,
}: {
  item: RecentlyViewedItem;
  onPress: (item: RecentlyViewedItem) => void;
  onDelete: (id: string) => void;
}) {
  const accessibilityLabel = [
    item.title,
    item.type === "tv" ? "TV" : item.type === "movie" ? "Movie" : "Person",
    item.subtitle,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <SwipeableRow onDelete={() => onDelete(item.id)}>
      <Pressable
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className="bg-background px-4 py-3"
        style={({ pressed }) => ({
          borderBottomWidth: 0.5,
          borderBottomColor: "rgba(255,255,255,0.08)",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <RecentlyViewedRowContent item={item} />
      </Pressable>
    </SwipeableRow>
  );
});
