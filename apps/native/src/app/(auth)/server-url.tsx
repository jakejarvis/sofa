import { Trans, useLingui } from "@lingui/react/macro";
import { IconAlertCircle, IconCircleCheck, IconInfoCircle } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, type TextInput, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { AuthScreen } from "@/components/auth-screen";
import { Button, ButtonLabel } from "@/components/ui/button";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/text-field";
import { getServerUrl, serverManager, type ValidationError } from "@/lib/server";
import * as Haptics from "@/utils/haptics";

const TRAILING_SLASHES_RE = /\/+$/;

type ConnectionState =
  | { phase: "idle" }
  | { phase: "connecting" }
  | { phase: "success" }
  | { phase: "error"; error: ValidationError };

function getErrorMessages(
  t: (strings: TemplateStringsArray, ...values: unknown[]) => string,
): Record<ValidationError, string> {
  return {
    network_unreachable: t`Could not reach the server. Check your connection and the URL.`,
    timeout: t`Connection timed out. The server might be down or unreachable.`,
    not_sofa_server: t`This doesn't appear to be a Sofa server. Double-check the URL.`,
    server_unhealthy: t`Server found but reporting an issue. Try again in a moment.`,
    invalid_url: t`That URL doesn't look right. Include the full server address.`,
  };
}

export default function ServerUrlScreen() {
  const { t } = useLingui();
  const { replace } = useRouter();
  const inputRef = useRef<TextInput>(null);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [url, setUrl] = useState(() => (serverManager.hasStoredServerUrl() ? getServerUrl() : ""));
  const [connection, setConnection] = useState<ConnectionState>({
    phase: "idle",
  });

  const statusCompletedColor = useCSSVariable("--color-status-completed") as string;
  const destructiveColor = useCSSVariable("--color-destructive") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;

  // Icon pulse animation
  const iconOpacity = useSharedValue(1);
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.get(),
  }));

  // Pulsing dot animation for connecting state
  const dotOpacity = useSharedValue(0.4);
  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.get(),
  }));

  useEffect(() => {
    if (connection.phase === "connecting") {
      iconOpacity.set(withRepeat(withTiming(0.4, { duration: 600 }), -1, true));
      dotOpacity.set(withRepeat(withTiming(1, { duration: 600 }), -1, true));
    } else {
      iconOpacity.set(withTiming(1, { duration: 200 }));
      dotOpacity.set(0.4);
    }
  }, [connection.phase, iconOpacity, dotOpacity]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeout.current !== null) clearTimeout(successTimeout.current);
    };
  }, []);

  const handleChangeText = (text: string) => {
    setUrl(text);
    if (connection.phase === "error") {
      setConnection({ phase: "idle" });
    }
  };

  const handleConnect = async () => {
    const trimmed = url.trim().replace(TRAILING_SLASHES_RE, "");
    if (!trimmed) return;

    const fullUrl = serverManager.normalizeUrl(trimmed);

    if (!URL.canParse(fullUrl)) {
      setConnection({ phase: "error", error: "invalid_url" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setConnection({ phase: "connecting" });

    const result = await serverManager.validateServerUrl(fullUrl);

    if (result.status === "success") {
      setConnection({ phase: "success" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      serverManager.connectToServer(fullUrl, result.instanceId);
      successTimeout.current = setTimeout(() => {
        replace("/(auth)/login");
      }, 800);
    } else {
      setConnection({ phase: "error", error: result.error });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isConnecting = connection.phase === "connecting";
  const isSuccess = connection.phase === "success";
  const trimmedUrl = url.trim().replace(TRAILING_SLASHES_RE, "");
  const isValidUrl = !!trimmedUrl && URL.canParse(serverManager.normalizeUrl(trimmedUrl));
  const isDisabled = isConnecting || isSuccess;

  return (
    <AuthScreen
      title="Sofa"
      subtitle={t`Enter your Sofa server URL to get started`}
      logoStyle={iconAnimatedStyle}
    >
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <Input
          ref={inputRef}
          value={url}
          accessibilityLabel={t`Server URL`}
          accessibilityHint={t`Enter the full URL for your Sofa server`}
          onChangeText={handleChangeText}
          placeholder="https://sofa.example.com"
          placeholderTextColorClassName="accent-muted-foreground/50"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
          returnKeyType="go"
          editable={!isDisabled}
          onSubmitEditing={handleConnect}
          className="font-mono"
        />
      </Animated.View>

      {/* Connect Button / Status */}
      <Animated.View entering={FadeInDown.duration(300).delay(300)} className="mt-4">
        {isConnecting ? (
          <View className="min-h-12 flex-row items-center justify-center gap-2 py-2">
            <Animated.View className="bg-primary size-1.5 rounded-full" style={dotAnimatedStyle} />
            <Text className="text-muted-foreground text-sm">
              <Trans>Connecting to server...</Trans>
            </Text>
          </View>
        ) : isSuccess ? (
          <View className="min-h-12 flex-row items-center justify-center gap-1.5 py-2">
            <ScaledIcon icon={IconCircleCheck} size={16} color={statusCompletedColor} />
            <Text className="text-status-completed font-sans text-sm font-medium">
              <Trans>Connected</Trans>
            </Text>
          </View>
        ) : (
          <Button onPress={handleConnect} disabled={!isValidUrl} className="bg-primary">
            <ButtonLabel>
              <Trans>Connect</Trans>
            </ButtonLabel>
          </Button>
        )}
      </Animated.View>

      <View className="mt-3 min-h-10">
        {connection.phase === "error" && (
          <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-row items-start gap-2 px-1"
          >
            <ScaledIcon
              icon={IconAlertCircle}
              size={16}
              color={destructiveColor}
              style={{ marginTop: 1 }}
            />
            <Text selectable className="text-destructive flex-1 text-sm">
              {getErrorMessages(t)[connection.error]}
            </Text>
          </Animated.View>
        )}
      </View>

      <Animated.View
        entering={FadeInDown.duration(300).delay(400)}
        className="mt-4 flex items-center justify-center gap-1"
      >
        <Pressable
          onPress={() => Linking.openURL("https://sofa.watch")}
          className="flex-row items-center gap-1.5"
        >
          <ScaledIcon icon={IconInfoCircle} size={16} color={mutedFgColor} />
          <Text className="text-primary font-sans text-sm font-medium">
            <Trans>Don't have a server?</Trans>
          </Text>
        </Pressable>
      </Animated.View>
    </AuthScreen>
  );
}
