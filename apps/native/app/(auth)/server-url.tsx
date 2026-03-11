import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SofaLogo } from "@/components/ui/sofa-logo";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import {
  hasStoredServerUrl,
  normalizeUrl,
  setServerUrl,
  splitUrl,
  type ValidationError,
  validateServerUrl,
} from "@/lib/server-url";

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [protocol, setProtocol] = useState("https://");
  const [host, setHost] = useState("");
  const [connection, setConnection] = useState<ConnectionState>({
    phase: "idle",
  });

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
    // If user pastes/types a full URL with protocol, split it
    if (text.includes("://")) {
      const { protocol: p, host: h } = splitUrl(text);
      setProtocol(p);
      setHost(h.replace(/\/+$/, ""));
    } else {
      setHost(text);
    }

    // Clear error when user starts typing again
    if (connection.phase === "error") {
      setConnection({ phase: "idle" });
    }
  };

  const handleConnect = async () => {
    const trimmedHost = host.trim().replace(/\/+$/, "");
    if (!trimmedHost) return;

    const fullUrl = normalizeUrl(`${protocol}${trimmedHost}`);
    setConnection({ phase: "connecting" });

    const result = await validateServerUrl(fullUrl);

    if (result.status === "success") {
      setConnection({ phase: "success" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setServerUrl(fullUrl);
      successTimeout.current = setTimeout(() => {
        router.replace("/(auth)/login");
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
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className="mb-8 items-center"
      >
        <Animated.View style={iconAnimatedStyle}>
          <SofaLogo size={48} />
        </Animated.View>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 32,
            color: colors.foreground,
            marginTop: 12,
          }}
        >
          Sofa
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(100)}>
        <Text
          style={{
            fontSize: 14,
            color: colors.mutedForeground,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Enter your Sofa server URL to get started
        </Text>
      </Animated.View>

      {/* URL Input */}
      <Animated.View entering={FadeInDown.duration(300).delay(200)}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.input,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 48,
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 15,
              fontFamily: fonts.sans,
            }}
          >
            {protocol}
          </Text>
          <TextInput
            ref={inputRef}
            value={host}
            onChangeText={handleChangeText}
            placeholder="sofa.example.com"
            placeholderTextColor={`${colors.mutedForeground}80`}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="URL"
            returnKeyType="go"
            editable={!isDisabled}
            onSubmitEditing={handleConnect}
            style={{
              flex: 1,
              color: colors.foreground,
              fontSize: 15,
              fontFamily: fonts.sans,
              paddingVertical: 0,
            }}
          />
        </View>
      </Animated.View>

      {/* Connect Button */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(300)}
        style={{ marginTop: 16 }}
      >
        <Button
          onPress={handleConnect}
          isDisabled={isDisabled}
          style={{
            backgroundColor: isSuccess
              ? colors.statusCompleted
              : colors.primary,
          }}
        >
          {isConnecting ? (
            <Button.Label
              style={{
                color: colors.primaryForeground,
                fontFamily: fonts.sansMedium,
              }}
            >
              Connecting...
            </Button.Label>
          ) : isSuccess ? (
            <Button.Label
              style={{
                color: colors.primaryForeground,
                fontFamily: fonts.sansMedium,
              }}
            >
              Connected
            </Button.Label>
          ) : (
            <Button.Label
              style={{
                color: colors.primaryForeground,
                fontFamily: fonts.sansMedium,
              }}
            >
              Connect
            </Button.Label>
          )}
        </Button>
      </Animated.View>

      {/* Connection Status Feedback */}
      {connection.phase === "connecting" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 16,
            gap: 8,
          }}
        >
          <Animated.View
            style={[
              {
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.primary,
              },
              dotAnimatedStyle,
            ]}
          />
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 13,
              fontFamily: fonts.sans,
            }}
          >
            Connecting to server...
          </Text>
        </Animated.View>
      )}

      {connection.phase === "success" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 16,
            gap: 6,
          }}
        >
          <IconCircleCheck size={16} color={colors.statusCompleted} />
          <Text
            style={{
              color: colors.statusCompleted,
              fontSize: 13,
              fontFamily: fonts.sansMedium,
            }}
          >
            Connected
          </Text>
        </Animated.View>
      )}

      {connection.phase === "error" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: 16,
            gap: 8,
            paddingHorizontal: 4,
          }}
        >
          <IconAlertCircle
            size={16}
            color={colors.destructive}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              color: colors.destructive,
              fontSize: 13,
              fontFamily: fonts.sans,
              flex: 1,
            }}
          >
            {ERROR_MESSAGES[connection.error]}
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}
