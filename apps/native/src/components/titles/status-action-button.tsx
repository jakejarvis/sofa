import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconBookmarkFilled,
  IconCheck,
  IconPlayerPlayFilled,
  IconPlus,
} from "@tabler/icons-react-native";
import { Alert, Pressable } from "react-native";
import { useCSSVariable } from "uniwind";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";

type TitleStatus = "in_watchlist" | "watching" | "caught_up" | "completed";

const STATUS_ICONS = {
  in_watchlist: IconBookmarkFilled,
  watching: IconPlayerPlayFilled,
  caught_up: IconCheck,
  completed: IconCheck,
} as const;

const STATUS_STYLES = {
  in_watchlist: {
    bgClass: "bg-title-accent/10 border-title-accent/20",
    textClass: "text-title-accent",
  },
  watching: {
    bgClass: "bg-title-accent/10 border-title-accent/20",
    textClass: "text-title-accent",
  },
  caught_up: {
    bgClass: "bg-status-completed/10 border-status-completed/20",
    textClass: "text-status-completed",
  },
  completed: {
    bgClass: "bg-status-completed/10 border-status-completed/20",
    textClass: "text-status-completed",
  },
} as const;

function StatusLabel({ status }: { status: TitleStatus }) {
  switch (status) {
    case "in_watchlist":
      return <Trans>In Watchlist</Trans>;
    case "watching":
      return <Trans>Watching</Trans>;
    case "caught_up":
      return <Trans>Caught Up</Trans>;
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
          onStatusChange("in_watchlist");
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
  const iconColor =
    currentStatus === "completed" || currentStatus === "caught_up" ? completedColor : titleAccent;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          t`Remove from library?`,
          t`This title will be removed from your library. Your watch history and ratings will be kept.`,
          [
            { text: t`Cancel`, style: "cancel" },
            {
              text: t`Remove`,
              style: "destructive",
              onPress: () => onStatusChange(null),
            },
          ],
        );
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
