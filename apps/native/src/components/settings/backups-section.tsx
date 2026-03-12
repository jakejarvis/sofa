import {
  IconChevronRight,
  IconDatabaseExport,
  IconPlus,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import * as DropdownMenu from "zeego/dropdown-menu";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Text } from "@/components/ui/text";
import { orpc, queryClient } from "@/utils/orpc";
import { toast } from "@/utils/toast";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsSection() {
  const backups = useQuery(orpc.admin.backups.list.queryOptions());
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  const createBackup = useMutation(
    orpc.admin.backups.create.mutationOptions({
      onSuccess: () => {
        toast.success("Backup created");
        queryClient.invalidateQueries({ queryKey: orpc.admin.backups.key() });
      },
      onError: () => toast.error("Failed to create backup"),
    }),
  );

  const deleteBackup = useMutation(
    orpc.admin.backups.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Backup deleted");
        queryClient.invalidateQueries({ queryKey: orpc.admin.backups.key() });
      },
      onError: () => toast.error("Failed to delete backup"),
    }),
  );

  return (
    <SettingsSection title="Backups" icon={IconDatabaseExport} badge="Admin">
      {backups.isPending ? (
        <View className="items-center py-4">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : (
        <>
          {backups.data?.backups.map((backup) => (
            <DropdownMenu.Root key={backup.filename}>
              <DropdownMenu.Trigger asChild>
                <Pressable
                  className="flex-row items-center border-border border-b py-3.5"
                  style={{ borderBottomWidth: 0.5 }}
                >
                  <Text className="flex-1 text-[15px] text-foreground">
                    {backup.filename}
                  </Text>
                  <Text className="mr-1 text-[14px] text-muted-foreground">
                    {formatSize(backup.sizeBytes)}
                  </Text>
                  <IconChevronRight size={16} color={mutedFgColor} />
                </Pressable>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  key="delete"
                  destructive
                  onSelect={() =>
                    deleteBackup.mutate({ filename: backup.filename })
                  }
                >
                  <DropdownMenu.ItemIcon ios={{ name: "trash" }} />
                  <DropdownMenu.ItemTitle>Delete Backup</DropdownMenu.ItemTitle>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
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
