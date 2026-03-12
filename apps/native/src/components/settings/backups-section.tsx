import { IconDatabaseExport, IconPlus } from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Alert, View } from "react-native";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsSection() {
  const backups = useQuery(orpc.admin.backups.list.queryOptions());

  const createBackup = useMutation(
    orpc.admin.backups.create.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: orpc.admin.backups.key() });
      },
      onError: () => Alert.alert("Error", "Failed to create backup"),
    }),
  );

  const deleteBackup = useMutation(
    orpc.admin.backups.delete.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.admin.backups.key() }),
    }),
  );

  const handleBackupPress = (filename: string) => {
    Alert.alert("Backup", filename, [
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteBackup.mutate({ filename }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SettingsSection title="Backups" icon={IconDatabaseExport} badge="Admin">
      {backups.isPending ? (
        <View className="items-center py-4">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : (
        <>
          {backups.data?.backups.map((backup) => (
            <SettingsRow
              key={backup.filename}
              label={backup.filename}
              value={formatSize(backup.sizeBytes)}
              onPress={() => handleBackupPress(backup.filename)}
            />
          ))}
          <SettingsRow
            label={createBackup.isPending ? "Creating..." : "Create Backup"}
            icon={IconPlus}
            onPress={() => createBackup.mutate()}
            disabled={createBackup.isPending}
          />
        </>
      )}
    </SettingsSection>
  );
}
