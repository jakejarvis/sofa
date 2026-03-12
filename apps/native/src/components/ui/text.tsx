import { Text as RNText, type TextProps } from "react-native";

import { cn } from "@/utils/cn";

export function Text({
  className,
  ...props
}: TextProps & { className?: string }) {
  return <RNText className={cn("font-sans", className)} {...props} />;
}
