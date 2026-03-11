import { forwardRef, type PropsWithChildren } from "react";
import {
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function TextField({ children }: PropsWithChildren) {
  return <View style={{ gap: 6 }}>{children}</View>;
}

export function Label(props: TextProps) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.sansMedium,
          fontSize: 14,
          color: colors.foreground,
        },
        props.style,
      ]}
      {...props}
    />
  );
}

export const Input = forwardRef<TextInput, TextInputProps>((props, ref) => {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={`${colors.mutedForeground}80`}
      {...props}
      style={[
        {
          height: 48,
          borderRadius: 12,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.input,
          paddingHorizontal: 14,
          fontSize: 15,
          fontFamily: fonts.sans,
          color: colors.foreground,
        },
        props.style,
      ]}
    />
  );
});

Input.displayName = "Input";

export function FieldError({
  isInvalid,
  children,
  ...props
}: PropsWithChildren<TextProps & { isInvalid?: boolean }>) {
  if (!isInvalid) return null;
  return (
    <Text
      style={[{ fontSize: 13, color: colors.destructive }, props.style]}
      {...props}
    >
      {children}
    </Text>
  );
}
