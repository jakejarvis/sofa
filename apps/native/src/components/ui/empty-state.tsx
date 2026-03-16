import type { Icon } from "@tabler/icons-react-native";
import { IconMovie } from "@tabler/icons-react-native";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

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
  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="items-center justify-center px-6 py-12"
      accessibilityLabel={description ? `${title}. ${description}` : title}
    >
      <View accessible={false}>
        <IconComponent size={48} color={mutedForeground} />
      </View>
      <Text className="mt-3 text-center font-medium font-sans text-base text-foreground">
        {title}
      </Text>
      {description && (
        <Text className="mt-1 text-center text-muted-foreground text-sm">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} size="sm" className="mt-4 bg-primary">
          <ButtonLabel className="text-primary-foreground">
            {actionLabel}
          </ButtonLabel>
        </Button>
      )}
    </Animated.View>
  );
}
