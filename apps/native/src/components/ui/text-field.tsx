import {
  createContext,
  forwardRef,
  type PropsWithChildren,
  useContext,
  useId,
} from "react";
import {
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";

import { cn } from "@/utils/cn";

const TextFieldContext = createContext<string | undefined>(undefined);

export function TextField({ children }: PropsWithChildren) {
  const id = useId();
  return (
    <TextFieldContext.Provider value={id}>
      <View className="gap-1.5">{children}</View>
    </TextFieldContext.Provider>
  );
}

export function Label({
  className,
  nativeID,
  ...props
}: TextProps & { className?: string }) {
  const ctxId = useContext(TextFieldContext);
  return (
    <Text
      nativeID={nativeID ?? ctxId}
      className={cn("font-medium font-sans text-foreground text-sm", className)}
      {...props}
    />
  );
}

export const Input = forwardRef<
  TextInput,
  TextInputProps & { className?: string }
>(({ className, style, ...props }, ref) => {
  const ctxId = useContext(TextFieldContext);
  return (
    <TextInput
      ref={ref}
      accessibilityLabelledBy={ctxId}
      placeholderTextColorClassName="accent-muted-foreground/70"
      className={cn(
        "min-h-12 rounded-[12px] border border-border bg-input px-3.5 py-3 font-sans text-foreground text-sm",
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
    <Text
      selectable
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {children}
    </Text>
  );
}
