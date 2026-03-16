import { IconRefresh, IconWebhook } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, View } from "react-native";
import { IntegrationCard } from "@/components/settings/integration-card";
import { INTEGRATION_CONFIGS } from "@/components/settings/integration-configs";
import { SectionHeader } from "@/components/ui/section-header";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export function IntegrationsSection() {
  const integrations = useQuery(orpc.integrations.list.queryOptions());

  return (
    <View className="mb-6">
      <SectionHeader title="Integrations" icon={IconWebhook} />

      {integrations.isPending ? (
        <View className="items-center py-4">
          <Spinner colorClassName="accent-primary" />
        </View>
      ) : integrations.isError ? (
        <View className="items-center gap-2 py-4">
          <Text className="text-[13px] text-muted-foreground">
            Could not load integrations
          </Text>
          <Pressable
            onPress={() => integrations.refetch()}
            className="flex-row items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5"
            style={{ borderCurve: "continuous" }}
          >
            <IconRefresh size={14} className="accent-primary" />
            <Text className="font-medium font-sans text-[13px] text-primary">
              Retry
            </Text>
          </Pressable>
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
