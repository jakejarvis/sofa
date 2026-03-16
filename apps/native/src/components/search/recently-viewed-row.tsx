import { Link } from "expo-router";
import { memo, useMemo } from "react";
import { Pressable } from "react-native";
import { RecentlyViewedRowContent } from "@/components/search/recently-viewed-row-content";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import type { RecentlyViewedItem } from "@/lib/recently-viewed";

export const RecentlyViewedRow = memo(function RecentlyViewedRow({
  item,
  onDelete,
}: {
  item: RecentlyViewedItem;
  onDelete: (id: string) => void;
}) {
  const accessibilityLabel = [
    item.title,
    item.type === "tv" ? "TV" : item.type === "movie" ? "Movie" : "Person",
    item.subtitle,
  ]
    .filter(Boolean)
    .join(", ");

  const href = useMemo(
    () =>
      item.type === "person"
        ? (`/person/${item.id}` as `/person/${string}`)
        : (`/title/${item.id}` as `/title/${string}`),
    [item.id, item.type],
  );

  return (
    <SwipeableRow onDelete={() => onDelete(item.id)}>
      <Link href={href} asChild>
        <Pressable
          accessibilityRole="link"
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
      </Link>
    </SwipeableRow>
  );
});
