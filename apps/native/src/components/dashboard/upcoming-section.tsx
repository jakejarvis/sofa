import { useLingui } from "@lingui/react/macro";
import { IconCalendarEvent } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { SectionHeader } from "@/components/ui/section-header";
import { orpc } from "@/lib/orpc";

import { UpcomingRow } from "./upcoming-row";

export function UpcomingSection() {
  const { t } = useLingui();
  const { push } = useRouter();
  const { data, isPending } = useQuery(
    orpc.dashboard.upcoming.queryOptions({ input: { days: 7, limit: 5 } }),
  );

  if (isPending) return null;

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <View>
      <View className="px-4">
        <SectionHeader
          title={t`Upcoming`}
          icon={IconCalendarEvent}
          onSeeAll={() => push("/upcoming")}
        />
      </View>
      <View className="gap-2 px-4">
        {items.map((item, i) => (
          <UpcomingRow key={`${item.titleId}-${item.date}-${i}`} item={item} />
        ))}
      </View>
    </View>
  );
}
