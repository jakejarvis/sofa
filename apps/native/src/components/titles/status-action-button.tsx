import {
  IconBookmarkFilled,
  IconCheck,
  IconPlayerPlayFilled,
  IconPlus,
} from "@tabler/icons-react-native";
import { Pressable } from "react-native";
import { useCSSVariable } from "uniwind";
import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";

type TitleStatus = "watchlist" | "in_progress" | "completed";

const statusConfig = {
  watchlist: {
    label: "Watchlisted",
    Icon: IconBookmarkFilled,
    bgClass: "bg-title-accent/10 border-title-accent/20",
    textClass: "text-title-accent",
  },
  in_progress: {
    label: "Watching",
    Icon: IconPlayerPlayFilled,
    bgClass: "bg-title-accent/10 border-title-accent/20",
    textClass: "text-title-accent",
  },
  completed: {
    label: "Completed",
    Icon: IconCheck,
    bgClass: "bg-status-completed/10 border-status-completed/20",
    textClass: "text-status-completed",
  },
} as const;

export function StatusActionButton({
  currentStatus,
  onStatusChange,
  isPending,
}: {
  currentStatus: TitleStatus | null;
  onStatusChange: (status: TitleStatus | null) => void;
  isPending: boolean;
}) {
  const [titleAccent, completedColor] = useCSSVariable([
    "--color-title-accent",
    "--color-status-completed",
  ]) as [string, string];

  const config = currentStatus
    ? statusConfig[currentStatus as keyof typeof statusConfig]
    : null;

  if (!config) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStatusChange("watchlist");
        }}
        disabled={isPending}
        accessibilityRole="button"
        accessibilityLabel="Add to watchlist"
        className="flex-row items-center gap-1.5 rounded-lg border border-title-accent/20 bg-title-accent/10 px-4 py-2"
      >
        <IconPlus size={14} color={titleAccent} strokeWidth={2.5} />
        <Text className="font-sans-medium text-sm text-title-accent">
          Watchlist
        </Text>
      </Pressable>
    );
  }

  const iconColor =
    currentStatus === "completed" ? completedColor : titleAccent;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStatusChange(null);
      }}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={`${config.label}, double tap to remove`}
      className={`flex-row items-center gap-1.5 rounded-lg border px-4 py-2 ${config.bgClass}`}
    >
      <config.Icon size={14} color={iconColor} />
      <Text className={`font-sans-medium text-sm ${config.textClass}`}>
        {config.label}
      </Text>
    </Pressable>
  );
}
