import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconArrowUpRight,
  IconBrandGithub,
  IconCamera,
  IconChartBar,
  IconCloud,
  IconDatabase,
  IconDeviceMobileCog,
  IconDots,
  IconLanguage,
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
import { reloadAppAsync } from "expo";
import * as Application from "expo-application";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { SelectModal } from "@/components/ui/select-modal";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { setPersistedLocale } from "@/lib/i18n";
import { orpc } from "@/lib/orpc";
import { isAnalyticsEnabled, setAnalyticsEnabled } from "@/lib/posthog";
import { queryClient } from "@/lib/query-client";
import { authClient, getServerUrl, requestServerChange } from "@/lib/server";
import { toast } from "@/lib/toast";
import { activateLocale, isLocaleRTL, type SupportedLocale } from "@sofa/i18n";
import { LOCALE_INFO } from "@sofa/i18n/locales";

const settingsContentContainerStyle = {
  paddingTop: 12,
  paddingBottom: 24,
  paddingHorizontal: 16,
};

export default function SettingsScreen() {
  const { t, i18n } = useLingui();
  const { push } = useRouter();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!isEditingName && session?.user?.name) setNameInput(session.user.name);
  }, [session?.user?.name, isEditingName]);

  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const languageLabel = LOCALE_INFO.find((o) => o.code === i18n.locale)?.nativeName ?? i18n.locale;
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
    accounts?.some((a: { providerId: string }) => a.providerId === "credential") ?? false;
  const showPasswordOption = hasPassword && !(authConfig.data?.passwordLoginDisabled ?? true);

  const systemHealth = useQuery({
    ...orpc.admin.systemHealth.queryOptions(),
    enabled: isAdmin,
  });

  const updateName = useMutation(
    orpc.account.updateName.mutationOptions({
      onSuccess: () => {
        toast.success(t`Name updated`);
        setIsEditingName(false);
        queryClient.invalidateQueries({ queryKey: orpc.account.key() });
        refetchSession();
      },
      onError: () => toast.error(t`Failed to update name`),
    }),
  );

  const { mutate: uploadAvatarFile, isPending: isUploadingAvatar } = useMutation(
    orpc.account.uploadAvatar.mutationOptions({
      onSuccess: () => {
        toast.success(t`Profile picture updated`);
        queryClient.invalidateQueries({ queryKey: orpc.account.key() });
        refetchSession();
      },
      onError: () => toast.error(t`Failed to upload avatar`),
    }),
  );

  const removeAvatar = useMutation(
    orpc.account.removeAvatar.mutationOptions({
      onSuccess: () => {
        toast.success(t`Profile picture removed`);
        queryClient.invalidateQueries({ queryKey: orpc.account.key() });
        refetchSession();
      },
      onError: () => toast.error(t`Failed to remove profile picture`),
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
    uploadAvatarFile(file);
  }, [uploadAvatarFile]);

  const hasAvatarImage = !!session?.user?.image;

  const registration = useQuery({
    ...orpc.admin.registration.queryOptions(),
    enabled: isAdmin,
  });

  const toggleRegistration = useMutation(
    orpc.admin.toggleRegistration.mutationOptions({
      onSuccess: (_data, { open }) => {
        toast.success(open ? t`Registration opened` : t`Registration closed`);
        queryClient.invalidateQueries({
          queryKey: orpc.admin.registration.key(),
        });
      },
      onError: () => toast.error(t`Failed to update registration setting`),
    }),
  );

  const updateCheck = useQuery({
    ...orpc.admin.updateCheck.queryOptions(),
    enabled: isAdmin,
  });

  const toggleUpdateCheck = useMutation(
    orpc.admin.toggleUpdateCheck.mutationOptions({
      onSuccess: (_data, { enabled }) => {
        toast.success(enabled ? t`Update checks enabled` : t`Update checks disabled`);
        queryClient.invalidateQueries({
          queryKey: orpc.admin.updateCheck.key(),
        });
      },
      onError: () => toast.error(t`Failed to update setting`),
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
    Alert.alert(t`Sign Out`, t`Are you sure you want to sign out?`, [
      { text: t`Cancel`, style: "cancel" },
      {
        text: t`Sign Out`,
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
      scrollToOverflowEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Account */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <SettingsSection title={t`Account`} icon={IconUser}>
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
                    <View className="bg-secondary size-11 overflow-hidden rounded-full">
                      {isUploadingAvatar ? (
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
                    <View className="bg-primary absolute right-0 bottom-0 size-[18px] items-center justify-center rounded-full">
                      <IconCamera size={10} color={primaryFgColor} />
                    </View>
                  </Pressable>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item key="change" onSelect={() => pickAvatar()}>
                    <DropdownMenu.ItemIcon ios={{ name: "photo.on.rectangle.angled" }} />
                    <DropdownMenu.ItemTitle>
                      <Trans>Change Photo</Trans>
                    </DropdownMenu.ItemTitle>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    key="remove"
                    destructive
                    onSelect={() => removeAvatar.mutate()}
                  >
                    <DropdownMenu.ItemIcon ios={{ name: "trash" }} />
                    <DropdownMenu.ItemTitle>
                      <Trans>Remove Photo</Trans>
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
                <View className="bg-secondary size-11 overflow-hidden rounded-full">
                  {isUploadingAvatar ? (
                    <View className="flex-1 items-center justify-center">
                      <Spinner size="sm" colorClassName="accent-primary" />
                    </View>
                  ) : (
                    <View className="bg-primary/[0.08] flex-1 items-center justify-center">
                      <Text className="font-display text-primary text-lg font-medium">
                        {session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="bg-primary absolute right-0 bottom-0 size-[18px] items-center justify-center rounded-full">
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
                    className="border-primary text-foreground min-h-10 flex-1 border-b py-2 font-sans text-base"
                    autoFocus
                  />
                  <Pressable onPress={() => updateName.mutate({ name: nameInput })}>
                    <Text className="text-primary text-sm">
                      <Trans>Save</Trans>
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setNameInput(session?.user?.name ?? "");
                      setIsEditingName(false);
                    }}
                  >
                    <Text className="text-muted-foreground text-sm">
                      <Trans>Cancel</Trans>
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setIsEditingName(true)}>
                  <Text className="text-foreground font-sans text-base font-medium">
                    {session?.user?.name}
                  </Text>
                </Pressable>
              )}
              <Text selectable className="text-muted-foreground mt-0.5 text-sm">
                {session?.user?.email}
              </Text>
            </View>
            {isAdmin && (
              <View className="bg-primary/10 rounded-full px-2 py-0.5">
                <Text
                  maxFontSizeMultiplier={1.0}
                  className="text-primary font-sans text-xs font-medium"
                >
                  <Trans>Admin</Trans>
                </Text>
              </View>
            )}
          </View>

          {showPasswordOption && (
            <SettingsRow
              label={hasPassword ? t`Change password` : t`Set password`}
              icon={IconLock}
              onPress={() => push("/change-password")}
            />
          )}

          <SettingsRow label={t`Sign out`} icon={IconLogout} onPress={handleSignOut} destructive />
        </SettingsSection>
      </Animated.View>

      {/* Server */}
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <SettingsSection title={t`Application`} icon={IconDeviceMobileCog}>
          <SettingsRow
            label={t`Server URL`}
            value={serverUrl}
            icon={IconLink}
            onPress={() => {
              Alert.alert(t`Change Server`, t`You'll be signed out to change the server URL.`, [
                { text: t`Cancel`, style: "cancel" },
                {
                  text: t`Continue`,
                  style: "destructive",
                  onPress: async () => {
                    requestServerChange();
                    await authClient.signOut();
                    queryClient.clear();
                  },
                },
              ]);
            }}
          />
          <SettingsRow
            label={t`Language`}
            value={languageLabel}
            icon={IconLanguage}
            onPress={() => setLanguageModalOpen(true)}
          />
          <SettingsRow
            label={t`Anonymous usage reporting`}
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
          <SettingsSection title={t`Server Health`} icon={IconServer} badge={t`Admin`}>
            {systemHealth.isPending ? (
              <View className="items-center py-4">
                <Spinner colorClassName="accent-primary" />
              </View>
            ) : systemHealth.data ? (
              <>
                <SettingsRow
                  label={t`Database`}
                  value={
                    systemHealth.data?.database
                      ? plural(systemHealth.data.database.titleCount, {
                          one: "# title",
                          other: "# titles",
                        })
                      : "—"
                  }
                  icon={IconDatabase}
                />
                <SettingsRow
                  label="TMDB"
                  value={systemHealth.data?.tmdb?.connected ? t`Connected` : "—"}
                  icon={IconCloud}
                />
                <SettingsRow
                  label={t`Image Cache`}
                  value={
                    systemHealth.data?.imageCache
                      ? plural(systemHealth.data.imageCache.imageCount, {
                          one: "# image",
                          other: "# images",
                        })
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
          <SettingsSection title={t`Security`} icon={IconShield} badge={t`Admin`}>
            <SettingsRow
              label={t`Open registration`}
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
              label={t`Check for updates`}
              icon={IconCloud}
              right={
                <Switch
                  value={updateCheck.data?.enabled ?? false}
                  accessibilityLabel="Check for updates"
                  onValueChange={(enabled) => toggleUpdateCheck.mutate({ enabled })}
                />
              }
            />
            {(() => {
              const latestVersion = updateCheck.data?.updateCheck?.latestVersion;
              return updateCheck.data?.updateCheck?.updateAvailable ? (
                <View className="py-3.5">
                  <Text className="text-status-completed font-sans text-sm font-medium">
                    <Trans>Update available: {latestVersion}</Trans>
                  </Text>
                </View>
              ) : null;
            })()}
          </SettingsSection>
        </Animated.View>
      )}

      {/* More Settings */}
      <Animated.View entering={FadeInDown.duration(300).delay(400)}>
        <SettingsSection title={t`More Settings`} icon={IconDots}>
          <Pressable
            onPress={() => Linking.openURL(`${serverUrl}/settings`)}
            className="flex-row items-center justify-center py-3.5 active:opacity-70"
          >
            <ScaledIcon icon={IconWorld} size={18} color={mutedFgColor} />
            <Text className="text-foreground ml-2 flex-1 text-base">
              <Trans>Open in browser…</Trans>
            </Text>
            <ScaledIcon icon={IconArrowUpRight} size={16} color={mutedFgColor} />
          </Pressable>
        </SettingsSection>
      </Animated.View>

      {/* Language Modal */}
      <SelectModal
        open={languageModalOpen}
        onOpenChange={setLanguageModalOpen}
        label={t`Language`}
        icon={IconLanguage}
        selection={i18n.locale}
        options={LOCALE_INFO.map((info) => ({
          value: info.code,
          label: info.nativeName,
        }))}
        onSelect={(locale) => {
          setLanguageModalOpen(false);
          const previousLocale = i18n.locale;
          activateLocale(locale as SupportedLocale).then(
            () => {
              setPersistedLocale(locale as SupportedLocale);
              if (isLocaleRTL(locale) !== isLocaleRTL(previousLocale)) {
                Alert.alert(
                  t`Restart Required`,
                  t`Sofa needs to restart to apply the new layout direction.`,
                  [{ text: t`Restart`, onPress: () => reloadAppAsync() }],
                );
              }
            },
            () => {},
          );
        }}
      />

      {/* Version */}
      <Animated.View entering={FadeInDown.duration(300).delay(400)} className="mt-6 items-center">
        <Text className="text-muted-foreground text-xs">
          Native
          {Application.nativeApplicationVersion ? ` v${Application.nativeApplicationVersion}` : ""}
          {Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ""}
          {updateCheck.data?.updateCheck?.currentVersion
            ? ` · Server v${updateCheck.data.updateCheck.currentVersion}`
            : ""}
        </Text>
      </Animated.View>

      {/* GitHub */}
      <Animated.View entering={FadeInDown.duration(300).delay(450)} className="mt-3 items-center">
        <Pressable
          onPress={() => Linking.openURL("https://github.com/jakejarvis/sofa")}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <ScaledIcon icon={IconBrandGithub} size={14} color={mutedFgColor} />
          <Text className="text-muted-foreground text-xs">jakejarvis/sofa</Text>
        </Pressable>
      </Animated.View>

      {/* TMDB Attribution */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(500)}
        className="mt-5 items-center gap-2"
      >
        <Pressable
          onPress={() => Linking.openURL("https://www.themoviedb.org/")}
          className="items-center gap-2 active:opacity-70"
        >
          <TmdbLogo height={12} />
          <Text
            maxFontSizeMultiplier={1.2}
            className="text-muted-foreground text-center text-[10px] leading-relaxed"
          >
            <Trans>This product uses the TMDB API but is not endorsed or certified by TMDB.</Trans>
          </Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
