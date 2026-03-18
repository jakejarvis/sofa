import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

const SIZES = { sm: "small", default: "large" } as const;

interface SpinnerProps extends Omit<ActivityIndicatorProps, "size" | "color"> {
  size?: "sm" | "default";
}

export function Spinner({ size = "default", ...props }: SpinnerProps) {
  return (
    <ActivityIndicator size={SIZES[size]} colorClassName="accent-primary-foreground" {...props} />
  );
}
