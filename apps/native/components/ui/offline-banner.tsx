import { IconWifiOff } from "@tabler/icons-react-native";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const wasOnline = useRef(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      if (mounted) {
        const offline = !state.isConnected || !state.isInternetReachable;
        setIsOffline(offline);
        if (offline && wasOnline.current) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        wasOnline.current = !offline;
      }
    };

    check();
    const interval = setInterval(check, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
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
      <View
        className="mx-4 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5"
        style={{ backgroundColor: colors.destructive }}
      >
        <IconWifiOff size={16} color="white" />
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 13,
            color: "white",
          }}
        >
          No internet connection
        </Text>
      </View>
    </Animated.View>
  );
}
