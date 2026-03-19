import { useLingui } from "@lingui/react/macro";
import type { Icon } from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import * as DropdownMenu from "zeego/dropdown-menu";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Sparkline } from "@/components/ui/sparkline";
import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";
import type { HistoryBucket, TimePeriod } from "@sofa/api/schemas";

interface StatsCardProps {
  label: string;
  value: number | undefined;
  icon: Icon;
  color: string;
  tintColor: string;
  bgColor: string;
  sparklineData?: HistoryBucket[];
  period?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
}

const periods: TimePeriod[] = ["today", "this_week", "this_month", "this_year"];

function usePeriodLabels() {
  const { t } = useLingui();
  return {
    today: t`Today`,
    this_week: t`This Week`,
    this_month: t`This Month`,
    this_year: t`This Year`,
  } as Record<TimePeriod, string>;
}

const cardStyle = { flex: 1 } as const;

function CardInner({
  label,
  value,
  icon: IconComponent,
  color,
  tintColor,
  bgColor,
  sparklineData,
}: Omit<StatsCardProps, "period" | "onPeriodChange">) {
  return (
    <View
      className="bg-card overflow-hidden rounded-xl border border-white/[0.06] p-2.5"
      style={{ borderCurve: "continuous" }}
    >
      {sparklineData && <Sparkline data={sparklineData} color={tintColor} />}
      <View className="z-10 flex-row items-center gap-1.5">
        <View className={`items-center justify-center rounded-md p-[5px] ${bgColor}`}>
          <ScaledIcon icon={IconComponent} size={12} color={tintColor} />
        </View>
        <Text
          className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase"
          maxFontSizeMultiplier={1.5}
        >
          {label}
        </Text>
      </View>
      <Text
        className={`font-display z-10 mt-2 text-2xl tracking-tight ${color}`}
        style={{ fontVariant: ["tabular-nums"] }}
        maxFontSizeMultiplier={1.5}
      >
        {value ?? "—"}
      </Text>
    </View>
  );
}

export function StatsCard(props: StatsCardProps) {
  const { period, onPeriodChange } = props;
  const periodLabels = usePeriodLabels();

  if (!onPeriodChange) {
    return (
      <View style={cardStyle}>
        <CardInner {...props} />
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            accessibilityRole="button"
          >
            <CardInner {...props} />
          </Pressable>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          {periods.map((p) => (
            <DropdownMenu.CheckboxItem
              key={p}
              value={p === period ? "on" : "off"}
              onValueChange={() => onPeriodChange(p)}
            >
              <DropdownMenu.ItemIndicator />
              <DropdownMenu.ItemTitle>{periodLabels[p]}</DropdownMenu.ItemTitle>
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </View>
  );
}
