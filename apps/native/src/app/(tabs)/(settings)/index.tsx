import {
  IconCamera,
  IconCloud,
  IconDatabase,
  IconLink,
  IconLogout,
  IconPhoto,
  IconPuzzle,
  IconServer,
  IconShield,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { AddIntegrationRow } from "@/components/settings/add-integration-row";
import { BackupsSection } from "@/components/settings/backups-section";
import { IntegrationRow } from "@/components/settings/integration-row";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

export default function SettingsScreen() {
  const { push, replace } = useRouter();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (session?.user?.name) setNameInput(session.user.name);
  }, [session?.user?.name]);

  const isAdmin = session?.user?.role === "admin";
  const serverUrl = getServerUrl();

  const systemHealth = useQuery({
    ...orpc.system.health.queryOptions(),
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
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
          replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingBottom: 32,
        paddingHorizontal: 16,
      }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: "Settings" }} />

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
                  <Pressable
                    onPress={() => {
                      setNameInput(session?.user?.name ?? "");
                      setIsEditingName(false);
                    }}
                  >
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
                selectable
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
            onPress={() => push("/(auth)/server-url")}
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
            {systemHealth.isPending ? (
              <View className="items-center py-4">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : systemHealth.data ? (
              <>
                <SettingsRow
                  label="Database"
                  value={
                    systemHealth.data?.database
                      ? `${systemHealth.data.database.titleCount} titles`
                      : "—"
                  }
                  icon={IconDatabase}
                />
                <SettingsRow
                  label="TMDB"
                  value={systemHealth.data?.tmdb?.connected ? "Connected" : "—"}
                  icon={IconCloud}
                />
                <SettingsRow
                  label="Image Cache"
                  value={
                    systemHealth.data?.imageCache
                      ? `${systemHealth.data.imageCache.imageCount} images`
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
        entering={FadeInDown.duration(300).delay(400)}
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
