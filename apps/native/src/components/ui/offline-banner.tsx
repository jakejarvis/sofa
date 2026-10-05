import { Trans } from "@lingui/react/macro";
import { IconWifiOff } from "@tabler/icons-react-native";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { probeServer, useHasServerUrl, useServerReachability } from "@/lib/server";
import * as Haptics from "@/utils/haptics";

export function OfflineBanner() {
  const [isDeviceOffline, setIsDeviceOffline] = useState(false);
  const hasServerUrl = useHasServerUrl();
  const { isReachable } = useServerReachability();
  const insets = useSafeAreaInsets();
  const wasVisible = useRef(false);

  useEffect(() => {
    let mounted = true;

    const handleState = (state: Network.NetworkState) => {
      if (!mounted) return;
      setIsDeviceOffline(!state.isConnected || state.isInternetReachable === false);
    };

    // Check initial state
    Network.getNetworkStateAsync().then(handleState);

    // Listen for changes
    const subscription = Network.addNetworkStateListener(handleState);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // The OS can report "no internet" while the Sofa server still answers (e.g. a LAN server on
  // Android Wi-Fi without validated internet), so only claim offline when the server is
  // unreachable too. Before a server is configured there is no reachability signal.
  const visible = isDeviceOffline && (!hasServerUrl || !isReachable);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    wasVisible.current = visible;
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(300).springify().damping(18)}
      exiting={SlideOutUp.duration(250)}
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <View className="bg-destructive mx-4 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5">
        <ScaledIcon icon={IconWifiOff} size={16} color="white" />
        <Text className="font-sans text-sm font-medium text-white">
          <Trans>No internet connection</Trans>
        </Text>
        <Pressable
          onPress={() => void probeServer()}
          className="ml-1 rounded-md bg-white/20 px-2 py-0.5"
        >
          <Text className="font-sans text-xs font-medium text-white">
            <Trans>Retry</Trans>
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
