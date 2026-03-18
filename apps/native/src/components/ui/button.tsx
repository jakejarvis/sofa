import { createContext, forwardRef, useContext } from "react";
import { Pressable, type PressableProps, type TextProps } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/utils/cn";

type ButtonVariant = "default" | "secondary";

const ButtonVariantContext = createContext<ButtonVariant>("default");

interface ButtonProps extends PressableProps {
  size?: "default" | "sm";
  variant?: ButtonVariant;
  className?: string;
}

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  ({ size = "default", variant = "default", className, style, disabled, ...props }, ref) => {
    return (
      <ButtonVariantContext.Provider value={variant}>
        <Pressable
          ref={ref}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!disabled }}
          className={cn(
            "items-center justify-center rounded-xl",
            size === "sm" ? "min-h-10 px-4 py-2" : "min-h-12 px-5 py-3",
            variant === "secondary" ? "bg-secondary" : "bg-primary",
            className,
          )}
          style={(state) => [
            {
              opacity: state.pressed ? 0.8 : disabled ? 0.5 : 1,
            },
            typeof style === "function" ? style(state) : style,
          ]}
          {...props}
        />
      </ButtonVariantContext.Provider>
    );
  },
);

Button.displayName = "Button";

interface ButtonLabelProps extends TextProps {
  className?: string;
}

export function ButtonLabel({ style, className, ...props }: ButtonLabelProps) {
  const variant = useContext(ButtonVariantContext);

  return (
    <Text
      className={cn(
        "text-center font-sans text-base font-medium",
        variant === "secondary" ? "text-secondary-foreground" : "text-primary-foreground",
        className,
      )}
      style={style}
      {...props}
    />
  );
}
