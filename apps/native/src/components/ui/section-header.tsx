import type { Icon } from "@tabler/icons-react-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";

interface SectionHeaderProps {
  title: string;
  icon?: Icon;
  iconColor?: string;
}

export function SectionHeader({
  title,
  icon: IconComponent,
  iconColor,
}: SectionHeaderProps) {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const resolvedColor = iconColor ?? primaryColor;

  return (
    <View className="mb-3 flex-row items-center gap-2">
      {IconComponent && (
        <ScaledIcon icon={IconComponent} size={20} color={resolvedColor} />
      )}
      <Text className="font-display text-foreground text-xl tracking-tight">
        {title}
      </Text>
    </View>
  );
}
