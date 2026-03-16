import type { Icon } from "@tabler/icons-react-native";
import {
  IconBookmarkFilled,
  IconCircleCheckFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Text } from "@/components/ui/text";

type TitleStatus = "watchlist" | "in_progress" | "completed";

const bgClasses: Record<TitleStatus, string> = {
  watchlist: "bg-status-watchlist/10",
  in_progress: "bg-status-watching/10",
  completed: "bg-status-completed/10",
};

const textClasses: Record<TitleStatus, string> = {
  watchlist: "text-status-watchlist",
  in_progress: "text-status-watching",
  completed: "text-status-completed",
};

const icons: Record<TitleStatus, { label: string; Icon: Icon }> = {
  watchlist: { label: "Watchlist", Icon: IconBookmarkFilled },
  in_progress: { label: "Watching", Icon: IconPlayerPlayFilled },
  completed: { label: "Completed", Icon: IconCircleCheckFilled },
};

export function StatusBadge({ status }: { status: TitleStatus }) {
  const watchlistColor = useCSSVariable("--color-status-watchlist") as string;
  const watchingColor = useCSSVariable("--color-status-watching") as string;
  const completedColor = useCSSVariable("--color-status-completed") as string;

  const colorMap: Record<TitleStatus, string> = {
    watchlist: watchlistColor,
    in_progress: watchingColor,
    completed: completedColor,
  };

  const { label, Icon: StatusIcon } = icons[status];
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${bgClasses[status]}`}
    >
      <StatusIcon size={12} color={colorMap[status]} />
      <Text
        className={`font-medium font-sans text-[11px] ${textClasses[status]}`}
      >
        {label}
      </Text>
    </View>
  );
}
