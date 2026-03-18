import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconBookmarkFilled,
  IconCheck,
  IconPlayerPlayFilled,
  IconPlus,
} from "@tabler/icons-react-native";
import { Pressable } from "react-native";
import { useCSSVariable } from "uniwind";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";

type TitleStatus = "watchlist" | "in_progress" | "completed";

const STATUS_ICONS = {
  watchlist: IconBookmarkFilled,
  in_progress: IconPlayerPlayFilled,
  completed: IconCheck,
} as const;

const STATUS_STYLES = {
  watchlist: {
    bgClass: "bg-title-accent/10 border-title-accent/20",
    textClass: "text-title-accent",
  },
  in_progress: {
    bgClass: "bg-title-accent/10 border-title-accent/20",
    textClass: "text-title-accent",
  },
  completed: {
    bgClass: "bg-status-completed/10 border-status-completed/20",
    textClass: "text-status-completed",
  },
} as const;

function StatusLabel({ status }: { status: TitleStatus }) {
  switch (status) {
    case "watchlist":
      return <Trans>Watchlisted</Trans>;
    case "in_progress":
      return <Trans>Watching</Trans>;
    case "completed":
      return <Trans>Completed</Trans>;
  }
}

export function StatusActionButton({
  currentStatus,
  onStatusChange,
  isPending,
}: {
  currentStatus: TitleStatus | null;
  onStatusChange: (status: TitleStatus | null) => void;
  isPending: boolean;
}) {
  const { t } = useLingui();
  const [titleAccent, completedColor] = useCSSVariable([
    "--color-title-accent",
    "--color-status-completed",
  ]) as [string, string];

  if (!currentStatus) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStatusChange("watchlist");
        }}
        disabled={isPending}
        accessibilityRole="button"
        accessibilityLabel={t`Add to watchlist`}
        className="border-title-accent/20 bg-title-accent/10 flex-row items-center gap-1.5 rounded-lg border px-4 py-2"
      >
        <ScaledIcon icon={IconPlus} size={14} color={titleAccent} strokeWidth={2.5} />
        <Text className="text-title-accent font-sans text-sm font-medium">
          <Trans>Watchlist</Trans>
        </Text>
      </Pressable>
    );
  }

  const StatusIcon = STATUS_ICONS[currentStatus];
  const styles = STATUS_STYLES[currentStatus];
  const iconColor = currentStatus === "completed" ? completedColor : titleAccent;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStatusChange(null);
      }}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={t`Remove from library`}
      className={`flex-row items-center gap-1.5 rounded-lg border px-4 py-2 ${styles.bgClass}`}
    >
      <ScaledIcon icon={StatusIcon} size={14} color={iconColor} />
      <Text className={`font-sans text-sm font-medium ${styles.textClass}`}>
        <StatusLabel status={currentStatus} />
      </Text>
    </Pressable>
  );
}
