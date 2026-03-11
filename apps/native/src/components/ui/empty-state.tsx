import type { Icon } from "@tabler/icons-react-native";
import { IconMovie } from "@tabler/icons-react-native";
import { Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button, ButtonLabel } from "@/components/ui/button";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: IconComponent = IconMovie,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="items-center justify-center px-6 py-12"
    >
      <IconComponent size={48} color={colors.mutedForeground} />
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 16,
          color: colors.foreground,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: 13,
            color: colors.mutedForeground,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          onPress={onAction}
          size="sm"
          className="mt-4"
          style={{ backgroundColor: colors.primary }}
        >
          <ButtonLabel style={{ color: colors.primaryForeground }}>
            {actionLabel}
          </ButtonLabel>
        </Button>
      )}
    </Animated.View>
  );
}
