import {
  IconBookmark,
  IconCircleCheck,
  IconPlayerPlay,
} from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";

type TitleStatus = "watchlist" | "in_progress" | "completed";

export function StatusActionButton({
  currentStatus,
  onStatusChange,
  isPending,
}: {
  currentStatus: TitleStatus | null;
  onStatusChange: (status: TitleStatus | null) => void;
  isPending: boolean;
}) {
  const statuses: Array<{
    status: TitleStatus;
    label: string;
    Icon: typeof IconBookmark;
  }> = [
    { status: "watchlist", label: "Watchlist", Icon: IconBookmark },
    { status: "in_progress", label: "Watching", Icon: IconPlayerPlay },
    { status: "completed", label: "Completed", Icon: IconCircleCheck },
  ];

  const primaryColor = useCSSVariable("--color-primary") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  return (
    <View className="flex-row gap-2">
      {statuses.map(({ status, label, Icon }) => {
        const isActive = currentStatus === status;
        return (
          <Pressable
            key={status}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStatusChange(isActive ? null : status);
            }}
            disabled={isPending}
            className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
              isActive
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <Icon size={14} color={isActive ? primaryColor : mutedFgColor} />
            <Text
              className={`font-sans-medium text-xs ${isActive ? "text-primary" : "text-foreground"}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
