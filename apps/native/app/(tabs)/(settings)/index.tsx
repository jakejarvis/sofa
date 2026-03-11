import {
  IconCamera,
  IconChevronRight,
  IconCloud,
  IconDatabase,
  IconDatabaseExport,
  IconLink,
  IconLogout,
  IconPhoto,
  IconPlus,
  IconPuzzle,
  IconServer,
  type IconSettings,
  IconShield,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SectionHeader } from "@/components/ui/section-header";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";
import { orpc, queryClient } from "@/utils/orpc";

function SettingsRow({
  label,
  value,
  onPress,
  icon: Icon,
  destructive,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: typeof IconSettings;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center py-3.5"
      style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
    >
      {Icon && (
        <Icon
          size={20}
          color={destructive ? colors.destructive : colors.mutedForeground}
          style={{ marginRight: 12 }}
        />
      )}
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sans,
          fontSize: 15,
          color: destructive ? colors.destructive : colors.foreground,
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={{
            fontSize: 14,
            color: colors.mutedForeground,
            marginRight: 4,
            maxWidth: 160,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress && <IconChevronRight size={16} color={colors.mutedForeground} />}
    </Pressable>
  );
}

function SettingsSection({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: typeof IconSettings;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center gap-2">
        <SectionHeader title={title} icon={icon} />
        {badge ? (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Text
              style={{
                fontSize: 10,
                color: colors.primary,
                fontFamily: fonts.sansMedium,
              }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        className="rounded-xl px-4"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {children}
      </View>
    </View>
  );
}

const PROVIDERS = ["plex", "jellyfin", "emby", "sonarr", "radarr"] as const;
type Provider = (typeof PROVIDERS)[number];

function IntegrationRow({
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
  const deleteIntegration = useMutation(
    orpc.integrations.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );

  const regenerateToken = useMutation(
    orpc.integrations.regenerateToken.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
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

function AddIntegrationRow({ existing }: { existing: string[] }) {
  const available = PROVIDERS.filter((p) => !existing.includes(p));

  const createIntegration = useMutation(
    orpc.integrations.create.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
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

function BackupsSection() {
  const backups = useQuery(orpc.admin.backups.list.queryOptions());

  const createBackup = useMutation(
    orpc.admin.backups.create.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
      onError: () => Alert.alert("Error", "Failed to create backup"),
    }),
  );

  const deleteBackup = useMutation(
    orpc.admin.backups.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SettingsSection title="Backups" icon={IconDatabaseExport} badge="Admin">
      {backups.isPending ? (
        <View className="items-center py-4">
          <ActivityIndicator color={colors.primary} />
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
          />
        </>
      )}
    </SettingsSection>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (session?.user?.name) setNameInput(session.user.name);
  }, [session?.user?.name]);

  const isAdmin = session?.user?.role === "admin";
  const serverUrl = getServerUrl();

  const systemStatus = useQuery({
    ...orpc.systemStatus.queryOptions(),
    enabled: isAdmin,
  });

  const integrations = useQuery(orpc.integrations.list.queryOptions());

  const updateName = useMutation(
    orpc.account.updateName.mutationOptions({
      onSuccess: () => {
        setIsEditingName(false);
        queryClient.invalidateQueries();
        refetchSession();
      },
    }),
  );

  const uploadAvatar = useMutation(
    orpc.account.uploadAvatar.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
        refetchSession();
      },
      onError: () => {
        Alert.alert("Error", "Failed to upload avatar");
      },
    }),
  );

  const removeAvatar = useMutation(
    orpc.account.removeAvatar.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
        refetchSession();
      },
    }),
  );

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const file = new File([blob], asset.fileName ?? "avatar.jpg", {
      type: asset.mimeType ?? "image/jpeg",
    });
    uploadAvatar.mutate(file);
  }, [uploadAvatar]);

  const handleAvatarPress = useCallback(async () => {
    const hasImage = !!session?.user?.image;
    if (hasImage) {
      Alert.alert("Profile Picture", "Choose an option", [
        {
          text: "Change Photo",
          onPress: () => pickAvatar(),
        },
        {
          text: "Remove Photo",
          style: "destructive",
          onPress: () => removeAvatar.mutate(),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      pickAvatar();
    }
  }, [session?.user?.image, removeAvatar, pickAvatar]);

  const registration = useQuery({
    ...orpc.admin.registration.queryOptions(),
    enabled: isAdmin,
  });

  const toggleRegistration = useMutation(
    orpc.admin.toggleRegistration.mutationOptions({
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        queryClient.invalidateQueries();
      },
    }),
  );

  const updateCheck = useQuery({
    ...orpc.admin.updateCheck.queryOptions(),
    enabled: isAdmin,
  });

  const toggleUpdateCheck = useMutation(
    orpc.admin.toggleUpdateCheck.mutationOptions({
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        queryClient.invalidateQueries();
      },
    }),
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          authClient.signOut();
          queryClient.clear();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 28,
            color: colors.foreground,
            marginBottom: 24,
          }}
        >
          Settings
        </Text>
      </Animated.View>

      {/* Account */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <SettingsSection title="Account" icon={IconUser}>
          <View
            className="flex-row items-center py-3.5"
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={handleAvatarPress} className="mr-3">
              <View
                className="overflow-hidden"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.secondary,
                }}
              >
                {uploadAvatar.isPending ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : session?.user?.image ? (
                  <Image
                    source={{ uri: session.user.image }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: 18,
                        color: colors.primary,
                      }}
                    >
                      {session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
              </View>
              <View
                className="absolute right-0 bottom-0 items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  backgroundColor: colors.primary,
                }}
              >
                <IconCamera size={10} color={colors.primaryForeground} />
              </View>
            </Pressable>
            <View className="flex-1">
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    style={{
                      flex: 1,
                      color: colors.foreground,
                      fontSize: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.primary,
                      paddingVertical: 2,
                    }}
                    autoFocus
                  />
                  <Pressable
                    onPress={() => updateName.mutate({ name: nameInput })}
                  >
                    <Text style={{ color: colors.primary, fontSize: 14 }}>
                      Save
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setIsEditingName(false)}>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 14 }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setIsEditingName(true)}>
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 16,
                      color: colors.foreground,
                    }}
                  >
                    {session?.user?.name}
                  </Text>
                </Pressable>
              )}
              <Text
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  marginTop: 2,
                }}
              >
                {session?.user?.email}
              </Text>
            </View>
            {isAdmin && (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.primary,
                    fontFamily: fonts.sansMedium,
                  }}
                >
                  Admin
                </Text>
              </View>
            )}
          </View>

          <SettingsRow
            label="Sign Out"
            icon={IconLogout}
            onPress={handleSignOut}
            destructive
          />
        </SettingsSection>
      </Animated.View>

      {/* Server */}
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <SettingsSection title="Server" icon={IconServer}>
          <SettingsRow
            label="Server URL"
            value={serverUrl}
            icon={IconLink}
            onPress={() => router.push("/(auth)/server-url")}
          />
        </SettingsSection>
      </Animated.View>

      {/* Integrations */}
      <Animated.View entering={FadeInDown.duration(300).delay(300)}>
        <SettingsSection title="Integrations" icon={IconPuzzle}>
          {integrations.isPending ? (
            <View className="items-center py-4">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {integrations.data?.integrations &&
                integrations.data.integrations.length > 0 &&
                integrations.data.integrations.map((integration) => (
                  <IntegrationRow
                    key={integration.provider}
                    integration={integration}
                  />
                ))}
              <AddIntegrationRow
                existing={
                  integrations.data?.integrations?.map((i) => i.provider) ?? []
                }
              />
            </>
          )}
        </SettingsSection>
      </Animated.View>

      {/* Admin: Server Health */}
      {isAdmin && (
        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <SettingsSection
            title="Server Health"
            icon={IconServer}
            badge="Admin"
          >
            {systemStatus.isPending ? (
              <View className="items-center py-4">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : systemStatus.data ? (
              <>
                <SettingsRow
                  label="Database"
                  value={
                    systemStatus.data.health?.database
                      ? `${systemStatus.data.health.database.titleCount} titles`
                      : "—"
                  }
                  icon={IconDatabase}
                />
                <SettingsRow
                  label="TMDB"
                  value={
                    systemStatus.data.health?.tmdb?.connected
                      ? "Connected"
                      : "—"
                  }
                  icon={IconCloud}
                />
                <SettingsRow
                  label="Image Cache"
                  value={
                    systemStatus.data.health?.imageCache
                      ? `${systemStatus.data.health.imageCache.imageCount} images`
                      : "—"
                  }
                  icon={IconPhoto}
                />
              </>
            ) : null}
          </SettingsSection>
        </Animated.View>
      )}

      {/* Admin: Security */}
      {isAdmin && (
        <Animated.View entering={FadeInDown.duration(300).delay(500)}>
          <SettingsSection title="Security" icon={IconShield} badge="Admin">
            <View
              className="flex-row items-center justify-between py-3.5"
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-3">
                <IconUserPlus size={20} color={colors.mutedForeground} />
                <Text style={{ fontSize: 15, color: colors.foreground }}>
                  Registration
                </Text>
              </View>
              <Switch
                value={registration.data?.open ?? false}
                onValueChange={(open) => toggleRegistration.mutate({ open })}
                trackColor={{
                  false: colors.secondary,
                  true: `${colors.primary}80`,
                }}
                thumbColor={
                  registration.data?.open
                    ? colors.primary
                    : colors.mutedForeground
                }
              />
            </View>
            <View
              className="flex-row items-center justify-between py-3.5"
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-3">
                <IconCloud size={20} color={colors.mutedForeground} />
                <Text style={{ fontSize: 15, color: colors.foreground }}>
                  Update Checks
                </Text>
              </View>
              <Switch
                value={updateCheck.data?.enabled ?? false}
                onValueChange={(enabled) =>
                  toggleUpdateCheck.mutate({ enabled })
                }
                trackColor={{
                  false: colors.secondary,
                  true: `${colors.primary}80`,
                }}
                thumbColor={
                  updateCheck.data?.enabled
                    ? colors.primary
                    : colors.mutedForeground
                }
              />
            </View>
            {updateCheck.data?.updateCheck?.updateAvailable && (
              <View className="py-3.5">
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.statusCompleted,
                    fontFamily: fonts.sansMedium,
                  }}
                >
                  Update available: {updateCheck.data.updateCheck.latestVersion}
                </Text>
              </View>
            )}
          </SettingsSection>
        </Animated.View>
      )}

      {/* Admin: Backups */}
      {isAdmin && (
        <Animated.View entering={FadeInDown.duration(300).delay(600)}>
          <BackupsSection />
        </Animated.View>
      )}

      {/* Version */}
      <Animated.View
        entering={FadeIn.duration(300).delay(400)}
        className="mt-4 items-center"
      >
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
          Sofa Mobile
          {updateCheck.data?.updateCheck?.currentVersion
            ? ` · Server ${updateCheck.data.updateCheck.currentVersion}`
            : ""}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}
