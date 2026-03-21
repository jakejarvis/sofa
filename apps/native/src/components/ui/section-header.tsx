import { useLingui } from "@lingui/react/macro";
import type { Icon } from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";

interface SectionHeaderProps {
  title: string;
  icon?: Icon;
  iconColor?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({
  title,
  icon: IconComponent,
  iconColor,
  onSeeAll,
}: SectionHeaderProps) {
  const { t } = useLingui();
  const primaryColor = useCSSVariable("--color-primary") as string;
  const resolvedColor = iconColor ?? primaryColor;

  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {IconComponent && <ScaledIcon icon={IconComponent} size={20} color={resolvedColor} />}
        <Text className="font-display text-foreground text-xl tracking-tight">{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text className="text-primary text-sm">{t`See all`}</Text>
        </Pressable>
      )}
    </View>
  );
}
