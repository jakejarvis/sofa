import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

import { colors } from "@/constants/colors";

const SIZES = { sm: "small", default: "large" } as const;

interface SpinnerProps extends Omit<ActivityIndicatorProps, "size" | "color"> {
  size?: "sm" | "default";
  color?: string;
}

export function Spinner({
  size = "default",
  color = colors.primaryForeground,
  ...props
}: SpinnerProps) {
  return <ActivityIndicator size={SIZES[size]} color={color} {...props} />;
}
