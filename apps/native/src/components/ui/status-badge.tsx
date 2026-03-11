import type { Icon } from "@tabler/icons-react-native";
import {
  IconBookmarkFilled,
  IconCircleCheckFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react-native";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type TitleStatus = "watchlist" | "in_progress" | "completed";

const statusConfig: Record<
  TitleStatus,
  { label: string; Icon: Icon; color: string }
> = {
  watchlist: {
    label: "Watchlist",
    Icon: IconBookmarkFilled,
    color: colors.statusWatchlist,
  },
  in_progress: {
    label: "Watching",
    Icon: IconPlayerPlayFilled,
    color: colors.statusWatching,
  },
  completed: {
    label: "Completed",
    Icon: IconCircleCheckFilled,
    color: colors.statusCompleted,
  },
};

export function StatusBadge({ status }: { status: TitleStatus }) {
  const config = statusConfig[status];
  const StatusIcon = config.Icon;
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: `${config.color}20` }}
    >
      <StatusIcon size={12} color={config.color} />
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 11,
          color: config.color,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
