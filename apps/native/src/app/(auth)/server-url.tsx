import {
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
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
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) return;

    const fullUrl = normalizeUrl(trimmed);
    setConnection({ phase: "connecting" });

    const result = await validateServerUrl(fullUrl);

    if (result.status === "success") {
      setConnection({ phase: "success" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setServerUrl(fullUrl);
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
  const trimmedUrl = url.trim().replace(/\/+$/, "");
  const isValidUrl = (() => {
    if (!trimmedUrl) return false;
    try {
      new URL(normalizeUrl(trimmedUrl));
      return true;
    } catch {
      return false;
    }
  })();
  const isDisabled = isConnecting || isSuccess;

  return (
    <AuthScreen
      title="Sofa"
      subtitle="Enter your Sofa server URL to get started"
      logoStyle={iconAnimatedStyle}
    >
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <View
          className="h-12 flex-row items-center rounded-[12px] border border-border bg-input px-3.5"
          style={{ borderCurve: "continuous" }}
        >
          <TextInput
            ref={inputRef}
            value={url}
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
            className="flex-1 py-0 font-mono text-[15px] text-foreground"
          />
        </View>
      </Animated.View>

      {/* Connect Button / Status */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(300)}
        className="mt-4"
      >
        {isConnecting ? (
          <View className="h-12 flex-row items-center justify-center gap-2">
            <Animated.View
              className="size-1.5 rounded-full bg-primary"
              style={dotAnimatedStyle}
            />
            <Text className="text-[13px] text-muted-foreground">
              Connecting to server...
            </Text>
          </View>
        ) : isSuccess ? (
          <View className="h-12 flex-row items-center justify-center gap-1.5">
            <IconCircleCheck size={16} color={statusCompletedColor} />
            <Text className="font-sans-medium text-[13px] text-status-completed">
              Connected
            </Text>
          </View>
        ) : (
          <Button
            onPress={handleConnect}
            disabled={!isValidUrl}
            className="bg-primary"
          >
            <ButtonLabel>Connect</ButtonLabel>
          </Button>
        )}
      </Animated.View>

      <View className="mt-3 min-h-10">
        {connection.phase === "error" && (
          <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-row items-start gap-2 px-1"
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
      </View>

      <Animated.View
        entering={FadeInDown.duration(300).delay(400)}
        className="mt-4 flex items-center justify-center gap-1"
      >
        <Pressable
          onPress={() => Linking.openURL("https://sofa.watch")}
          className="flex-row items-center gap-1.5"
        >
          <IconInfoCircle size={16} color={mutedFgColor} />
          <Text className="font-sans-medium text-[13px] text-primary">
            Don't have a server?
          </Text>
        </Pressable>
      </Animated.View>
    </AuthScreen>
  );
}
