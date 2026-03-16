import {
  IconArrowUpRight,
  IconBrandGithub,
  IconCamera,
  IconChartBar,
  IconCloud,
  IconDatabase,
  IconDeviceMobileCog,
  IconDots,
  IconLink,
  IconLock,
  IconLogout,
  IconPhoto,
  IconServer,
  IconShield,
  IconUser,
  IconUserPlus,
  IconWorld,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Application from "expo-application";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import * as DropdownMenu from "zeego/dropdown-menu";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { TmdbLogo } from "@/components/tmdb-logo";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { isAnalyticsEnabled, setAnalyticsEnabled } from "@/lib/posthog";
import { queryClient } from "@/lib/query-client";
import { getServerUrl } from "@/lib/server-url";
import { toast } from "@/lib/toast";

const settingsContentContainerStyle = {
  paddingTop: 8,
  paddingBottom: 32,
  paddingHorizontal: 16,
};

export default function SettingsScreen() {
  const { push } = useRouter();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!isEditingName && session?.user?.name) setNameInput(session.user.name);
  }, [session?.user?.name, isEditingName]);

  const [analyticsEnabled, setAnalyticsToggle] = useState(isAnalyticsEnabled);
  const isAdmin = session?.user?.role === "admin";
  const serverUrl = getServerUrl();

  const authConfig = useQuery(orpc.system.authConfig.queryOptions());
  const { data: accounts } = useQuery({
    queryKey: ["auth", "listAccounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      return result.data;
    },
  });
  const hasPassword =
    accounts?.some(
      (a: { providerId: string }) => a.providerId === "credential",
    ) ?? false;
  const showPasswordOption =
    hasPassword && !(authConfig.data?.passwordLoginDisabled ?? true);

  const systemHealth = useQuery({
    ...orpc.system.health.queryOptions(),
    enabled: isAdmin,
  });

  const updateName = useMutation(
    orpc.account.updateName.mutationOptions({
      onSuccess: () => {
        toast.success("Name updated");
        setIsEditingName(false);
        queryClient.invalidateQueries({ queryKey: orpc.account.key() });
        refetchSession();
      },
      onError: () => toast.error("Failed to update name"),
    }),
  );

  const uploadAvatar = useMutation(
    orpc.account.uploadAvatar.mutationOptions({
      onSuccess: () => {
        toast.success("Profile picture updated");
        queryClient.invalidateQueries({ queryKey: orpc.account.key() });
        refetchSession();
      },
      onError: () => toast.error("Failed to upload avatar"),
    }),
  );

  const removeAvatar = useMutation(
    orpc.account.removeAvatar.mutationOptions({
      onSuccess: () => {
        toast.success("Profile picture removed");
        queryClient.invalidateQueries({ queryKey: orpc.account.key() });
        refetchSession();
      },
      onError: () => toast.error("Failed to remove profile picture"),
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

  const hasAvatarImage = !!session?.user?.image;

  const registration = useQuery({
    ...orpc.admin.registration.queryOptions(),
    enabled: isAdmin,
  });

  const toggleRegistration = useMutation(
    orpc.admin.toggleRegistration.mutationOptions({
      onSuccess: (_data, { open }) => {
        toast.success(open ? "Registration opened" : "Registration closed");
        queryClient.invalidateQueries({
          queryKey: orpc.admin.registration.key(),
        });
      },
      onError: () => toast.error("Failed to update registration setting"),
    }),
  );

  const updateCheck = useQuery({
    ...orpc.admin.updateCheck.queryOptions(),
    enabled: isAdmin,
  });

  const toggleUpdateCheck = useMutation(
    orpc.admin.toggleUpdateCheck.mutationOptions({
      onSuccess: (_data, { enabled }) => {
        toast.success(
          enabled ? "Update checks enabled" : "Update checks disabled",
        );
        queryClient.invalidateQueries({
          queryKey: orpc.admin.updateCheck.key(),
        });
      },
      onError: () => toast.error("Failed to update setting"),
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
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={settingsContentContainerStyle}
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
          <View className="flex-row items-center py-3.5">
            {hasAvatarImage ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile photo"
                    accessibilityHint="Opens options to change or remove your photo"
                    className="mr-3"
                    hitSlop={8}
                  >
                    <View className="size-11 overflow-hidden rounded-full bg-secondary">
                      {uploadAvatar.isPending ? (
                        <View className="flex-1 items-center justify-center">
                          <Spinner size="sm" colorClassName="accent-primary" />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: session.user.image ?? undefined }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      )}
                    </View>
                    <View className="absolute right-0 bottom-0 size-[18px] items-center justify-center rounded-full bg-primary">
                      <IconCamera size={10} color={primaryFgColor} />
                    </View>
                  </Pressable>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item key="change" onSelect={() => pickAvatar()}>
                    <DropdownMenu.ItemIcon
                      ios={{ name: "photo.on.rectangle.angled" }}
                    />
                    <DropdownMenu.ItemTitle>
                      Change Photo
                    </DropdownMenu.ItemTitle>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    key="remove"
                    destructive
                    onSelect={() => removeAvatar.mutate()}
                  >
                    <DropdownMenu.ItemIcon ios={{ name: "trash" }} />
                    <DropdownMenu.ItemTitle>
                      Remove Photo
                    </DropdownMenu.ItemTitle>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            ) : (
              <Pressable
                onPress={pickAvatar}
                accessibilityRole="button"
                accessibilityLabel="Add profile photo"
                className="mr-3"
                hitSlop={8}
              >
                <View className="size-11 overflow-hidden rounded-full bg-secondary">
                  {uploadAvatar.isPending ? (
                    <View className="flex-1 items-center justify-center">
                      <Spinner size="sm" colorClassName="accent-primary" />
                    </View>
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
            )}
            <View className="flex-1">
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={nameInput}
                    accessibilityLabel="Display name"
                    onChangeText={setNameInput}
                    className="min-h-10 flex-1 border-primary border-b py-2 font-sans text-[15px] text-foreground"
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

          {showPasswordOption && (
            <SettingsRow
              label={hasPassword ? "Change password" : "Set password"}
              icon={IconLock}
              onPress={() => push("/(tabs)/(settings)/change-password")}
            />
          )}

          <SettingsRow
            label="Sign out"
            icon={IconLogout}
            onPress={handleSignOut}
            destructive
          />
        </SettingsSection>
      </Animated.View>

      {/* Server */}
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <SettingsSection title="Application" icon={IconDeviceMobileCog}>
          <SettingsRow
            label="Server URL"
            value={serverUrl}
            icon={IconLink}
            onPress={() => {
              Alert.alert(
                "Change Server",
                "You'll be signed out to change the server URL.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Continue",
                    style: "destructive",
                    onPress: async () => {
                      await authClient.signOut();
                      queryClient.clear();
                      push("/(auth)/server-url");
                    },
                  },
                ],
              );
            }}
          />
          <SettingsRow
            label="Anonymous usage reporting"
            icon={IconChartBar}
            right={
              <Switch
                value={analyticsEnabled}
                accessibilityLabel="Anonymous usage reporting"
                onValueChange={(enabled) => {
                  setAnalyticsToggle(enabled);
                  setAnalyticsEnabled(enabled);
                }}
              />
            }
          />
        </SettingsSection>
      </Animated.View>

      {/* Integrations */}
      <Animated.View entering={FadeInDown.duration(300).delay(300)}>
        <IntegrationsSection />
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
                <Spinner colorClassName="accent-primary" />
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
            <SettingsRow
              label="Open registration"
              icon={IconUserPlus}
              right={
                <Switch
                  value={registration.data?.open ?? false}
                  accessibilityLabel="Open registration"
                  onValueChange={(open) => toggleRegistration.mutate({ open })}
                />
              }
            />
            <SettingsRow
              label="Check for updates"
              icon={IconCloud}
              right={
                <Switch
                  value={updateCheck.data?.enabled ?? false}
                  accessibilityLabel="Check for updates"
                  onValueChange={(enabled) =>
                    toggleUpdateCheck.mutate({ enabled })
                  }
                />
              }
            />
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

      {/* More Settings */}
      <Animated.View entering={FadeInDown.duration(300).delay(400)}>
        <SettingsSection title="More Settings" icon={IconDots}>
          <Pressable
            onPress={() => Linking.openURL(`${serverUrl}/settings`)}
            className="flex-row items-center justify-center py-3.5 active:opacity-70"
          >
            <IconWorld size={18} color={mutedFgColor} />
            <Text className="ml-2 flex-1 text-[15px] text-foreground">
              Open in browser…
            </Text>
            <IconArrowUpRight size={16} color={mutedFgColor} />
          </Pressable>
        </SettingsSection>
      </Animated.View>

      {/* Version */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(400)}
        className="mt-6 items-center"
      >
        <Text className="text-muted-foreground text-xs">
          Native
          {Application.nativeApplicationVersion
            ? ` v${Application.nativeApplicationVersion}`
            : ""}
          {Application.nativeBuildVersion
            ? ` (${Application.nativeBuildVersion})`
            : ""}
          {updateCheck.data?.updateCheck?.currentVersion
            ? ` · Server v${updateCheck.data.updateCheck.currentVersion}`
            : ""}
        </Text>
      </Animated.View>

      {/* GitHub */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(450)}
        className="mt-3 items-center"
      >
        <Pressable
          onPress={() => Linking.openURL("https://github.com/jakejarvis/sofa")}
          className="flex-row items-center gap-1.5 active:opacity-70"
        >
          <IconBrandGithub size={14} color={mutedFgColor} />
          <Text className="text-muted-foreground text-xs">GitHub</Text>
        </Pressable>
      </Animated.View>

      {/* TMDB Attribution */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(500)}
        className="mt-4 items-center gap-2"
      >
        <Pressable
          onPress={() => Linking.openURL("https://www.themoviedb.org/")}
          className="items-center gap-2 active:opacity-70"
        >
          <TmdbLogo height={12} />
          <Text className="text-center text-[10px] text-muted-foreground leading-relaxed">
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
