import {
  IconChevronRight,
  IconCloud,
  IconDatabase,
  IconLink,
  IconLogout,
  IconPhoto,
  IconPuzzle,
  IconServer,
  type IconSettings,
  IconShield,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
      {value && (
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
      )}
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
        {badge && (
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
        )}
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(session?.user?.name ?? "");

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
      },
    }),
  );

  const registration = useQuery({
    ...orpc.admin.registration.queryOptions(),
    enabled: isAdmin,
  });

  const toggleRegistration = useMutation(
    orpc.admin.toggleRegistration.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
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

      {/* Account */}
      <SettingsSection title="Account" icon={IconUser}>
        <View
          className="flex-row items-center py-3.5"
          style={{
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <View
            className="mr-3 overflow-hidden"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.secondary,
            }}
          >
            {session?.user?.image ? (
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
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
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

      {/* Server */}
      <SettingsSection title="Server" icon={IconServer}>
        <SettingsRow
          label="Server URL"
          value={serverUrl}
          icon={IconLink}
          onPress={() => router.push("/(auth)/server-url")}
        />
      </SettingsSection>

      {/* Integrations */}
      <SettingsSection title="Integrations" icon={IconPuzzle}>
        {integrations.isPending ? (
          <View className="items-center py-4">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : integrations.data?.integrations &&
          integrations.data.integrations.length > 0 ? (
          integrations.data.integrations.map((integration) => (
            <SettingsRow
              key={integration.provider}
              label={integration.provider}
              value={integration.enabled ? "Connected" : "Disabled"}
            />
          ))
        ) : (
          <View className="items-center py-4">
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
              No integrations configured
            </Text>
          </View>
        )}
      </SettingsSection>

      {/* Admin: Server Health */}
      {isAdmin && (
        <SettingsSection title="Server Health" icon={IconServer} badge="Admin">
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
                  systemStatus.data.health?.tmdb?.connected ? "Connected" : "—"
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
      )}

      {/* Admin: Security */}
      {isAdmin && (
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
        </SettingsSection>
      )}

      {/* Version */}
      <View className="mt-4 items-center">
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
          Sofa Mobile v0.1.0
        </Text>
      </View>
    </ScrollView>
  );
}
