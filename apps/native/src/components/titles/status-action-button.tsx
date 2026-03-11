import {
  IconBookmark,
  IconCircleCheck,
  IconPlayerPlay,
} from "@tabler/icons-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
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
            className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
            style={{
              backgroundColor: isActive ? `${colors.primary}20` : colors.card,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
            }}
          >
            <Icon
              size={14}
              color={isActive ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 12,
                color: isActive ? colors.primary : colors.foreground,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
