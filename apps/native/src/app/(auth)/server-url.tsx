import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { Button, ButtonLabel } from "@/components/ui/button";
import { SofaLogo } from "@/components/ui/sofa-logo";
import { Text } from "@/components/ui/text";
import {
  getServerUrl,
  hasStoredServerUrl,
  normalizeUrl,
  setServerUrl,
  type ValidationError,
  validateServerUrl,
} from "@/lib/server-url";
import * as Haptics from "@/utils/haptics";

type ConnectionState =
  | { phase: "idle" }
  | { phase: "connecting" }
  | { phase: "success" }
  | { phase: "error"; error: ValidationError };

const ERROR_MESSAGES: Record<ValidationError, string> = {
  network_unreachable:
    "Could not reach the server. Check your connection and the URL.",
  timeout: "Connection timed out. The server might be down or unreachable.",
  not_sofa_server:
    "This doesn't appear to be a Sofa server. Double-check the URL.",
  server_unhealthy:
    "Server found but reporting an issue. Try again in a moment.",
  invalid_url: "That URL doesn't look right. Include the full server address.",
};

export default function ServerUrlScreen() {
  const { replace } = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [url, setUrl] = useState(() =>
    hasStoredServerUrl() ? getServerUrl() : "",
  );
  const [connection, setConnection] = useState<ConnectionState>({
    phase: "idle",
  });

  const statusCompletedColor = useCSSVariable(
    "--color-status-completed",
  ) as string;
  const destructiveColor = useCSSVariable("--color-destructive") as string;

  const [isFirstLaunch] = useState(() => !hasStoredServerUrl());

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

  // Auto-focus on first launch
  useEffect(() => {
    if (isFirstLaunch) {
      const timer = setTimeout(() => inputRef.current?.focus(), 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstLaunch]);

  const handleChangeText = (text: string) => {
    setUrl(text);
    if (connection.phase === "error") {
      setConnection({ phase: "idle" });
    }
  };

  const handleConnect = async () => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) return;

    const fullUrl = normalizeUrl(trimmed);
    setConnection({ phase: "connecting" });

    const result = await validateServerUrl(fullUrl);

    if (result.status === "success") {
      setConnection({ phase: "success" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setServerUrl(fullUrl);
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
  const isDisabled = isConnecting || isSuccess;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      className="bg-background"
    >
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className="mb-6 items-center"
      >
        <Animated.View style={iconAnimatedStyle}>
          <SofaLogo size={48} />
        </Animated.View>
        <Text className="mt-1.5 font-display text-[32px] text-foreground">
          Sofa
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(100)}>
        <Text className="mb-6 text-center text-muted-foreground text-sm">
          Enter your Sofa server URL to get started
        </Text>
      </Animated.View>

      {/* URL Input */}
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <View
          className="h-12 flex-row items-center rounded-[12px] border border-border bg-input px-3.5"
          style={{ borderCurve: "continuous" }}
        >
          <TextInput
            ref={inputRef}
            value={url}
            onChangeText={handleChangeText}
            placeholder="http://192.168.1.100:3000"
            placeholderTextColorClassName="accent-muted-foreground/50"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="URL"
            returnKeyType="go"
            editable={!isDisabled}
            onSubmitEditing={handleConnect}
            className="flex-1 py-0 font-sans text-[15px] text-foreground"
          />
        </View>
      </Animated.View>

      {/* Connect Button */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(300)}
        className="mt-4"
      >
        <Button
          onPress={handleConnect}
          disabled={isDisabled}
          className={isSuccess ? "bg-status-completed" : "bg-primary"}
        >
          {isConnecting ? (
            <ButtonLabel>Connecting...</ButtonLabel>
          ) : isSuccess ? (
            <ButtonLabel>Connected</ButtonLabel>
          ) : (
            <ButtonLabel>Connect</ButtonLabel>
          )}
        </Button>
      </Animated.View>

      {/* Connection Status Feedback */}
      {connection.phase === "connecting" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="mt-4 flex-row items-center justify-center gap-2"
        >
          <Animated.View
            className="size-1.5 rounded-full bg-primary"
            style={dotAnimatedStyle}
          />
          <Text className="text-[13px] text-muted-foreground">
            Connecting to server...
          </Text>
        </Animated.View>
      )}

      {connection.phase === "success" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="mt-4 flex-row items-center justify-center gap-1.5"
        >
          <IconCircleCheck size={16} color={statusCompletedColor} />
          <Text className="font-sans-medium text-[13px] text-status-completed">
            Connected
          </Text>
        </Animated.View>
      )}

      {connection.phase === "error" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="mt-4 flex-row items-start gap-2 px-1"
        >
          <IconAlertCircle
            size={16}
            color={destructiveColor}
            style={{ marginTop: 1 }}
          />
          <Text className="flex-1 text-[13px] text-destructive">
            {ERROR_MESSAGES[connection.error]}
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}
