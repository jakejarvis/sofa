import { IconPuzzle } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";

import { SettingsRow } from "@/components/settings/settings-row";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

const PROVIDERS = ["plex", "jellyfin", "emby", "sonarr", "radarr"] as const;

export function AddIntegrationRow({ existing }: { existing: string[] }) {
  const available = PROVIDERS.filter((p) => !existing.includes(p));

  const createIntegration = useMutation(
    orpc.integrations.create.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
    }),
  );

  if (available.length === 0) return null;

  const handleAdd = () => {
    Alert.alert("Add Integration", "Select a provider", [
      ...available.map((provider) => ({
        text: provider.charAt(0).toUpperCase() + provider.slice(1),
        onPress: () => createIntegration.mutate({ provider }),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <SettingsRow
      label="Add Integration"
      icon={IconPuzzle}
      onPress={handleAdd}
    />
  );
}
