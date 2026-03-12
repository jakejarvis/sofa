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
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { AddIntegrationRow } from "@/components/settings/add-integration-row";
import { BackupsSection } from "@/components/settings/backups-section";
import { IntegrationRow } from "@/components/settings/integration-row";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Text } from "@/components/ui/text";
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

  const primaryFgColor = useCSSVariable("--color-primary-foreground") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

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
      className="bg-background"
      contentContainerStyle={{
        paddingBottom: 32,
        paddingHorizontal: 16,
      }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColorClassName="accent-primary"
        />
      }
    >
      <Stack.Screen options={{ title: "Settings" }} />

      {/* Account */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <SettingsSection title="Account" icon={IconUser}>
          <View
            className="flex-row items-center border-border border-b py-3.5"
            style={{ borderBottomWidth: 0.5 }}
          >
            <Pressable onPress={handleAvatarPress} className="mr-3">
              <View className="size-11 overflow-hidden rounded-full bg-secondary">
                {uploadAvatar.isPending ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator
                      size="small"
                      colorClassName="accent-primary"
                    />
                  </View>
                ) : session?.user?.image ? (
                  <Image
                    source={{ uri: session.user.image }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-primary/[0.08]">
                    <Text className="font-sans-medium text-lg text-primary">
                      {session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
              </View>
              <View className="absolute right-0 bottom-0 size-[18px] items-center justify-center rounded-full bg-primary">
                <IconCamera size={10} color={primaryFgColor} />
              </View>
            </Pressable>
            <View className="flex-1">
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    className="flex-1 border-primary border-b py-0.5 font-sans text-[15px] text-foreground"
                    autoFocus
                  />
                  <Pressable
                    onPress={() => updateName.mutate({ name: nameInput })}
                  >
                    <Text className="text-primary text-sm">Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setNameInput(session?.user?.name ?? "");
                      setIsEditingName(false);
                    }}
                  >
                    <Text className="text-muted-foreground text-sm">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setIsEditingName(true)}>
                  <Text className="font-sans-medium text-base text-foreground">
                    {session?.user?.name}
                  </Text>
                </Pressable>
              )}
              <Text
                selectable
                className="mt-0.5 text-[13px] text-muted-foreground"
              >
                {session?.user?.email}
              </Text>
            </View>
            {isAdmin && (
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="font-sans-medium text-[10px] text-primary">
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
              <ActivityIndicator colorClassName="accent-primary" />
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
                <ActivityIndicator colorClassName="accent-primary" />
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
              className="flex-row items-center justify-between border-border border-b py-3.5"
              style={{ borderBottomWidth: 0.5 }}
            >
              <View className="flex-row items-center gap-3">
                <IconUserPlus size={20} color={mutedFgColor} />
                <Text className="text-[15px] text-foreground">
                  Registration
                </Text>
              </View>
              <Switch
                value={registration.data?.open ?? false}
                onValueChange={(open) => toggleRegistration.mutate({ open })}
                trackColorOffClassName="accent-secondary"
                trackColorOnClassName="accent-primary/50"
                thumbColorClassName={
                  registration.data?.open
                    ? "accent-primary"
                    : "accent-muted-foreground"
                }
              />
            </View>
            <View
              className="flex-row items-center justify-between border-border border-b py-3.5"
              style={{ borderBottomWidth: 0.5 }}
            >
              <View className="flex-row items-center gap-3">
                <IconCloud size={20} color={mutedFgColor} />
                <Text className="text-[15px] text-foreground">
                  Update Checks
                </Text>
              </View>
              <Switch
                value={updateCheck.data?.enabled ?? false}
                onValueChange={(enabled) =>
                  toggleUpdateCheck.mutate({ enabled })
                }
                trackColorOffClassName="accent-secondary"
                trackColorOnClassName="accent-primary/50"
                thumbColorClassName={
                  updateCheck.data?.enabled
                    ? "accent-primary"
                    : "accent-muted-foreground"
                }
              />
            </View>
            {updateCheck.data?.updateCheck?.updateAvailable && (
              <View className="py-3.5">
                <Text className="font-sans-medium text-[13px] text-status-completed">
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
        <Text className="text-muted-foreground text-xs">
          Sofa Mobile
          {updateCheck.data?.updateCheck?.currentVersion
            ? ` · Server ${updateCheck.data.updateCheck.currentVersion}`
            : ""}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}
