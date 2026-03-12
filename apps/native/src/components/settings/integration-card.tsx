import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconInfoCircle,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import type { IntegrationConfig } from "@/components/settings/integration-configs";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

interface IntegrationCardProps {
  config: IntegrationConfig;
  connection: {
    provider: string;
    type: string;
    token: string;
    enabled: boolean;
    lastEventAt: string | null;
  } | null;
}

export function IntegrationCard({ config, connection }: IntegrationCardProps) {
  const { provider, label } = config;
  const providerInput = provider as
    | "plex"
    | "jellyfin"
    | "emby"
    | "sonarr"
    | "radarr";

  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  const [expanded, setExpanded] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const chevronRotation = useSharedValue(0);
  const setupChevronRotation = useSharedValue(0);

  useEffect(() => {
    chevronRotation.set(withTiming(expanded ? 180 : 0, { duration: 200 }));
  }, [expanded, chevronRotation]);

  useEffect(() => {
    setupChevronRotation.set(
      withTiming(setupOpen ? 180 : 0, { duration: 200 }),
    );
  }, [setupOpen, setupChevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.get()}deg` }],
  }));

  const setupChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${setupChevronRotation.get()}deg` }],
  }));

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);
  const toggleSetup = useCallback(() => setSetupOpen((v) => !v), []);

  const connectMutation = useMutation(
    orpc.integrations.create.mutationOptions({
      onSuccess: () => {
        toast.success(`${label} connected`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(`Failed to connect ${label}`),
    }),
  );

  const deleteMutation = useMutation(
    orpc.integrations.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`${label} disconnected`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(`Failed to disconnect ${label}`),
    }),
  );

  const regenerateMutation = useMutation(
    orpc.integrations.regenerateToken.mutationOptions({
      onSuccess: () => {
        toast.success(`${label} URL regenerated`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(`Failed to regenerate ${label} URL`),
    }),
  );

  const url = connection ? config.buildUrl(connection.token) : null;

  const handleCopy = useCallback(async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      "Regenerate URL",
      `This will invalidate the current ${label} URL. You'll need to update it in ${label}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: () => regenerateMutation.mutate({ provider: providerInput }),
        },
      ],
    );
  }, [label, providerInput, regenerateMutation]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      `Disconnect ${label}`,
      `Are you sure you want to disconnect ${label}? The current URL will stop working.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ provider: providerInput }),
        },
      ],
    );
  }, [label, providerInput, deleteMutation]);

  const Icon = config.icon;

  return (
    <View
      className="mb-2 overflow-hidden rounded-xl border bg-card"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        borderCurve: "continuous",
      }}
    >
      {/* Header */}
      <Pressable
        onPress={toggleExpanded}
        className="flex-row items-center justify-between p-3"
      >
        <View className="flex-row items-center gap-3">
          <Icon
            width={18}
            height={18}
            color={connection ? primaryColor : mutedFgColor}
          />
          <View>
            <Text className="font-sans-medium text-[15px] text-foreground">
              {label}
            </Text>
            <Text className="mt-0.5 text-muted-foreground text-xs">
              {connection
                ? config.connectedStatus(connection.lastEventAt)
                : "Not configured"}
            </Text>
          </View>
        </View>

        <Animated.View style={chevronStyle}>
          <IconChevronDown size={18} color={mutedFgColor} />
        </Animated.View>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="border-white/[0.06] border-t px-4 pt-3 pb-4"
        >
          {/* Requirement note */}
          {config.requirementNote && (
            <View className="mb-3 flex-row items-start gap-2 rounded-lg bg-primary/[0.06] px-3 py-2.5">
              <IconInfoCircle
                size={14}
                color={primaryColor}
                className="mt-px"
              />
              <Text className="flex-1 text-[12px] text-foreground/80 leading-[18px]">
                {config.requirementNote}
              </Text>
            </View>
          )}

          {!connection ? (
            /* Connect button */
            <Pressable
              onPress={() =>
                connectMutation.mutate({ provider: providerInput })
              }
              disabled={connectMutation.isPending}
              className="items-center rounded-lg bg-primary py-3 active:opacity-80"
            >
              <Text className="font-sans-medium text-[15px] text-primary-foreground">
                {connectMutation.isPending ? "Connecting…" : `Connect ${label}`}
              </Text>
            </Pressable>
          ) : (
            <View className="gap-3">
              {/* URL display */}
              <View>
                <Text className="mb-1.5 text-muted-foreground text-xs">
                  {config.urlLabel}
                </Text>
                <View className="flex-row items-center rounded-lg bg-secondary/50 px-3 py-2.5">
                  <Text
                    className="flex-1 font-mono text-[11px] text-muted-foreground"
                    numberOfLines={1}
                  >
                    {url}
                  </Text>
                  <Pressable
                    onPress={handleCopy}
                    className="ml-2 active:opacity-60"
                    hitSlop={8}
                  >
                    {copied ? (
                      <IconCheck size={16} color="#4ade80" />
                    ) : (
                      <IconCopy size={16} color={mutedFgColor} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Action buttons */}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={handleRegenerate}
                  disabled={regenerateMutation.isPending}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-secondary py-2.5 active:opacity-80"
                >
                  <IconRefresh size={14} color={mutedFgColor} />
                  <Text className="font-sans-medium text-[13px] text-foreground">
                    Regenerate
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDisconnect}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2.5 active:opacity-80"
                >
                  <IconTrash size={14} color="#ef4444" />
                  <Text className="font-sans-medium text-[13px] text-destructive">
                    Disconnect
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Setup instructions (nested accordion) */}
          <View className="mt-3">
            <Pressable
              onPress={toggleSetup}
              className="flex-row items-center gap-1.5"
            >
              <Animated.View style={setupChevronStyle}>
                <IconChevronDown size={12} color={mutedFgColor} />
              </Animated.View>
              <Text className="text-muted-foreground text-xs">
                Setup instructions
              </Text>
            </Pressable>

            {setupOpen && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="mt-2 rounded-lg border border-white/[0.04] bg-secondary/30 px-3 py-2.5"
              >
                {config.setupSteps.map((step, i) => (
                  <View key={step} className="flex-row py-1">
                    <Text className="w-5 text-muted-foreground text-xs">
                      {i + 1}.
                    </Text>
                    <Text className="flex-1 text-muted-foreground text-xs leading-[18px]">
                      {step}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
