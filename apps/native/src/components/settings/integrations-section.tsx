import { IconWebhook } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { IntegrationCard } from "@/components/settings/integration-card";
import { INTEGRATION_CONFIGS } from "@/components/settings/integration-configs";
import { SectionHeader } from "@/components/ui/section-header";
import { orpc } from "@/utils/orpc";

export function IntegrationsSection() {
  const integrations = useQuery(orpc.integrations.list.queryOptions());

  return (
    <View className="mb-6">
      <SectionHeader title="Integrations" icon={IconWebhook} />

      {integrations.isPending ? (
        <View className="items-center py-4">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : (
        INTEGRATION_CONFIGS.map((config) => {
          const connection =
            integrations.data?.integrations?.find(
              (i) => i.provider === config.provider,
            ) ?? null;
          return (
            <IntegrationCard
              key={config.provider}
              config={config}
              connection={connection}
            />
          );
        })
      )}
    </View>
  );
}
