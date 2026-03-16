import { IconCloudOff } from "@tabler/icons-react-native";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { useServerReachability } from "@/lib/server-reachability";
import * as Haptics from "@/utils/haptics";

export function ServerUnreachableBanner() {
  const { isReachable } = useServerReachability();
  const insets = useSafeAreaInsets();
  const wasReachable = useRef(true);

  // Track device connectivity so we don't double up with OfflineBanner
  const [isDeviceOnline, setIsDeviceOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleState = (state: Network.NetworkState) => {
      if (!mounted) return;
      setIsDeviceOnline(!!state.isConnected && !!state.isInternetReachable);
    };

    Network.getNetworkStateAsync().then(handleState);
    const subscription = Network.addNetworkStateListener(handleState);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReachable && wasReachable.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    wasReachable.current = isReachable;
  }, [isReachable]);

  const handleRetry = () => {
    const refetchSession = authClient.$store.atoms.session.get().refetch;

    void Promise.allSettled([
      queryClient.resumePausedMutations(),
      queryClient.refetchQueries({ type: "active" }),
      refetchSession?.() ?? Promise.resolve(),
    ]);
  };

  // Only show when device has internet but server is unreachable
  if (isReachable || !isDeviceOnline) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(300)}
      exiting={SlideOutUp.duration(250)}
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <View className="mx-4 flex-row items-center justify-center gap-2 rounded-xl bg-status-watching px-4 py-2.5">
        <ScaledIcon icon={IconCloudOff} size={16} color="white" />
        <Text className="font-medium font-sans text-sm text-white">
          Can't reach server
        </Text>
        <Pressable
          onPress={handleRetry}
          className="ml-1 rounded-md bg-white/20 px-2 py-0.5"
        >
          <Text className="font-medium font-sans text-white text-xs">
            Retry
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
