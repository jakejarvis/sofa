import { forwardRef, type PropsWithChildren } from "react";
import {
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";

import { cn } from "@/utils/cn";

export function TextField({ children }: PropsWithChildren) {
  return <View className="gap-1.5">{children}</View>;
}

export function Label({
  className,
  ...props
}: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("font-sans-medium text-foreground text-sm", className)}
      {...props}
    />
  );
}

export const Input = forwardRef<
  TextInput,
  TextInputProps & { className?: string }
>(({ className, style, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      placeholderTextColorClassName="accent-muted-foreground/50"
      className={cn(
        "h-12 rounded-[12px] border border-border bg-input px-3.5 font-sans text-[15px] text-foreground",
        className,
      )}
      style={[{ borderCurve: "continuous" }, style]}
      {...props}
    />
  );
});

Input.displayName = "Input";

export function FieldError({
  isInvalid,
  children,
  className,
  ...props
}: PropsWithChildren<TextProps & { isInvalid?: boolean; className?: string }>) {
  if (!isInvalid) return null;
  return (
    <Text className={cn("text-[13px] text-destructive", className)} {...props}>
      {children}
    </Text>
  );
}
