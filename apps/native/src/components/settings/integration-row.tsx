import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";

import { SettingsRow } from "@/components/settings/settings-row";
import { orpc, queryClient } from "@/utils/orpc";
import { toast } from "@/utils/toast";

type Provider = "plex" | "jellyfin" | "emby" | "sonarr" | "radarr";

export function IntegrationRow({
  integration,
}: {
  integration: {
    provider: string;
    type: string;
    token: string;
    enabled: boolean;
    lastEventAt: string | null;
  };
}) {
  const label =
    integration.provider.charAt(0).toUpperCase() +
    integration.provider.slice(1);

  const deleteIntegration = useMutation(
    orpc.integrations.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`${label} disconnected`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(`Failed to disconnect ${label}`),
    }),
  );

  const regenerateToken = useMutation(
    orpc.integrations.regenerateToken.mutationOptions({
      onSuccess: () => {
        toast.success(`${label} URL regenerated`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(`Failed to regenerate ${label} URL`),
    }),
  );

  const handlePress = () => {
    Alert.alert(
      integration.provider.charAt(0).toUpperCase() +
        integration.provider.slice(1),
      `Type: ${integration.type}\nToken: ${integration.token.slice(0, 8)}...`,
      [
        {
          text: "Regenerate Token",
          onPress: () =>
            regenerateToken.mutate({
              provider: integration.provider as Provider,
            }),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteIntegration.mutate({
              provider: integration.provider as Provider,
            }),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  return (
    <SettingsRow
      label={
        integration.provider.charAt(0).toUpperCase() +
        integration.provider.slice(1)
      }
      value={integration.enabled ? "Connected" : "Disabled"}
      onPress={handlePress}
    />
  );
}
