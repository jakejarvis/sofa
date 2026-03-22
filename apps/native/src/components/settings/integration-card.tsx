import { Trans, useLingui } from "@lingui/react/macro";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import type { IntegrationConfig } from "@/components/settings/integration-configs";
import { ScaledIcon } from "@/components/ui/scaled-icon";
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
  const providerInput = provider as "plex" | "jellyfin" | "emby" | "sonarr" | "radarr";

  const { t } = useLingui();
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chevronRotation = useSharedValue(0);
  const setupChevronRotation = useSharedValue(0);

  useEffect(() => {
    chevronRotation.set(
      reduceMotion ? (expanded ? 180 : 0) : withTiming(expanded ? 180 : 0, { duration: 200 }),
    );
  }, [expanded, chevronRotation, reduceMotion]);

  useEffect(() => {
    setupChevronRotation.set(
      reduceMotion ? (setupOpen ? 180 : 0) : withTiming(setupOpen ? 180 : 0, { duration: 200 }),
    );
  }, [setupOpen, setupChevronRotation, reduceMotion]);

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
        toast.success(t`${label} connected`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(t`Failed to connect ${label}`),
    }),
  );

  const { mutate: deleteIntegration } = useMutation(
    orpc.integrations.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t`${label} disconnected`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(t`Failed to disconnect ${label}`),
    }),
  );

  const { mutate: regenerateToken, isPending: isRegenerating } = useMutation(
    orpc.integrations.regenerateToken.mutationOptions({
      onSuccess: () => {
        toast.success(t`${label} URL regenerated`);
        queryClient.invalidateQueries({ queryKey: orpc.integrations.key() });
      },
      onError: () => toast.error(t`Failed to regenerate ${label} URL`),
    }),
  );

  const url = connection ? config.buildUrl(connection.token) : null;

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    toast.success(t`URL copied to clipboard`);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(setCopied, 2000, false);
  }, [url, t]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      t`Regenerate URL`,
      t`This will invalidate the current ${label} URL. You'll need to update it in ${label}.`,
      [
        { text: t`Cancel`, style: "cancel" },
        {
          text: t`Regenerate`,
          style: "destructive",
          onPress: () => regenerateToken({ provider: providerInput }),
        },
      ],
    );
  }, [label, providerInput, regenerateToken, t]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      t`Disconnect ${label}`,
      t`Are you sure you want to disconnect ${label}? The current URL will stop working.`,
      [
        { text: t`Cancel`, style: "cancel" },
        {
          text: t`Disconnect`,
          style: "destructive",
          onPress: () => deleteIntegration({ provider: providerInput }),
        },
      ],
    );
  }, [label, providerInput, deleteIntegration, t]);

  const Icon = config.icon;

  return (
    <View
      className="bg-card mb-2 overflow-hidden rounded-xl border"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        borderCurve: "continuous",
      }}
    >
      {/* Header */}
      <Pressable
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${connection ? config.connectedStatus(connection.lastEventAt) : "Not configured"}`}
        accessibilityState={{ expanded }}
        className="flex-row items-center justify-between p-3"
      >
        <View className="flex-row items-center gap-3">
          <ScaledIcon icon={Icon} size={18} color={connection ? primaryColor : mutedFgColor} />
          <View>
            <Text className="text-foreground font-sans text-base font-medium">{label}</Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {connection ? config.connectedStatus(connection.lastEventAt) : t`Not configured`}
            </Text>
          </View>
        </View>

        <Animated.View style={chevronStyle}>
          <ScaledIcon icon={IconChevronDown} size={18} color={mutedFgColor} />
        </Animated.View>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="border-t border-white/[0.06] px-4 pt-3 pb-4"
        >
          {/* Requirement note */}
          {config.requirementNote && (
            <View className="bg-primary/[0.06] mb-3 flex-row items-start gap-2 rounded-lg px-3 py-2.5">
              <ScaledIcon icon={IconInfoCircle} size={14} color={primaryColor} className="mt-px" />
              <Text className="text-foreground/80 flex-1 text-xs">{config.requirementNote}</Text>
            </View>
          )}

          {!connection ? (
            /* Connect button */
            <Pressable
              onPress={() => connectMutation.mutate({ provider: providerInput })}
              disabled={connectMutation.isPending}
              className="bg-primary items-center rounded-lg py-2.5 active:opacity-80"
            >
              <Text className="text-primary-foreground font-sans font-medium">
                {connectMutation.isPending ? t`Connecting…` : t`Connect ${label}`}
              </Text>
            </Pressable>
          ) : (
            <View className="gap-3">
              {/* URL display */}
              <View>
                <Text className="text-muted-foreground mb-1.5 text-xs">{config.urlLabel}</Text>
                <View className="bg-secondary/50 flex-row items-center rounded-lg px-3 py-2.5">
                  <Text
                    maxFontSizeMultiplier={1.0}
                    className="text-muted-foreground flex-1 font-mono text-xs"
                    numberOfLines={1}
                  >
                    {url}
                  </Text>
                  <Pressable
                    onPress={handleCopy}
                    accessibilityRole="button"
                    accessibilityLabel={copied ? "Copied" : "Copy URL"}
                    className="ml-2 active:opacity-60"
                    hitSlop={8}
                  >
                    {copied ? (
                      <ScaledIcon icon={IconCheck} size={16} color="#4ade80" />
                    ) : (
                      <ScaledIcon icon={IconCopy} size={16} color={mutedFgColor} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Action buttons */}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={handleRegenerate}
                  disabled={isRegenerating}
                  className="bg-secondary flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 active:opacity-80"
                >
                  <ScaledIcon icon={IconRefresh} size={14} color={mutedFgColor} />
                  <Text className="text-foreground font-sans text-sm font-medium">
                    <Trans>Regenerate</Trans>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDisconnect}
                  className="bg-destructive/10 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 active:opacity-80"
                >
                  <ScaledIcon icon={IconTrash} size={14} color="#ef4444" />
                  <Text className="text-destructive font-sans text-sm font-medium">
                    <Trans>Disconnect</Trans>
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Setup instructions (nested accordion) */}
          <View className="mt-3">
            <Pressable onPress={toggleSetup} className="flex-row items-center gap-1.5">
              <Animated.View style={setupChevronStyle}>
                <ScaledIcon icon={IconChevronDown} size={12} color={mutedFgColor} />
              </Animated.View>
              <Text className="text-muted-foreground text-xs">
                <Trans>Setup instructions</Trans>
              </Text>
            </Pressable>

            {setupOpen && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="bg-secondary/30 mt-2 rounded-lg border border-white/[0.04] px-3 py-2.5"
              >
                {config.setupSteps.map((step, i) => (
                  <View key={step} className="flex-row py-1">
                    <Text className="text-muted-foreground w-5 text-xs">{i + 1}.</Text>
                    <Text className="text-muted-foreground flex-1 text-xs leading-[18px]">
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
