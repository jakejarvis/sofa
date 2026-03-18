import { Trans, useLingui } from "@lingui/react/macro";
import { IconRefresh, IconWebhook } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, View } from "react-native";

import { IntegrationCard } from "@/components/settings/integration-card";
import { getIntegrationConfigs } from "@/components/settings/integration-configs";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { SectionHeader } from "@/components/ui/section-header";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export function IntegrationsSection() {
  const { t, i18n } = useLingui();
  const configs = getIntegrationConfigs(i18n);
  const integrations = useQuery(orpc.integrations.list.queryOptions());

  return (
    <View className="mb-6">
      <SectionHeader title={t`Integrations`} icon={IconWebhook} />

      {integrations.isPending ? (
        <View className="items-center py-4">
          <Spinner colorClassName="accent-primary" />
        </View>
      ) : integrations.isError ? (
        <View className="items-center gap-2 py-4">
          <Text className="text-muted-foreground text-sm">
            <Trans>Could not load integrations</Trans>
          </Text>
          <Pressable
            onPress={() => integrations.refetch()}
            className="bg-secondary flex-row items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ borderCurve: "continuous" }}
          >
            <ScaledIcon icon={IconRefresh} size={14} className="accent-primary" />
            <Text className="text-primary font-sans text-sm font-medium">
              <Trans>Retry</Trans>
            </Text>
          </Pressable>
        </View>
      ) : (
        configs.map((config) => {
          const connection =
            integrations.data?.integrations?.find((i) => i.provider === config.provider) ?? null;
          return <IntegrationCard key={config.provider} config={config} connection={connection} />;
        })
      )}
    </View>
  );
}
