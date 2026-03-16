import { IconWifiOff } from "@tabler/icons-react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScaledIcon } from "@/components/ui/scaled-icon";
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

    Network.getNetworkStateAsync().then(handleState);

    const subscription = Network.addNetworkStateListener(handleState);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!isOffline) return null;

  const useGlass = isLiquidGlassAvailable();

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
      {useGlass ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          style={{
            marginHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <ScaledIcon icon={IconWifiOff} size={16} color="white" />
          <Text className="font-medium font-sans text-sm text-white">
            No internet connection
          </Text>
        </GlassView>
      ) : (
        <View className="mx-4 flex-row items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5">
          <ScaledIcon icon={IconWifiOff} size={16} color="white" />
          <Text className="font-medium font-sans text-sm text-white">
            No internet connection
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
