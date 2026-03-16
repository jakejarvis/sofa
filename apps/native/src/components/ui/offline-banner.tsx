import { IconWifiOff } from "@tabler/icons-react-native";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import * as Haptics from "@/utils/haptics";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const wasOnline = useRef(true);

  useEffect(() => {
    let mounted = true;

    const handleState = (state: Network.NetworkState) => {
      if (!mounted) return;
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      if (offline && wasOnline.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      wasOnline.current = !offline;
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

  if (!isOffline) return null;

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
      <View className="mx-4 flex-row items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5">
        <IconWifiOff size={16} color="white" />
        <Text className="font-medium font-sans text-[13px] text-white">
          No internet connection
        </Text>
      </View>
    </Animated.View>
  );
}
