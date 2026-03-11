import { createContext, forwardRef, useContext } from "react";
import {
  Pressable,
  type PressableProps,
  Text,
  type TextProps,
} from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { cn } from "@/utils/cn";

type ButtonVariant = "default" | "secondary";

const ButtonVariantContext = createContext<ButtonVariant>("default");

const variantForeground: Record<ButtonVariant, string> = {
  default: colors.primaryForeground,
  secondary: colors.secondaryForeground,
};

interface ButtonProps extends PressableProps {
  size?: "default" | "sm";
  variant?: ButtonVariant;
  className?: string;
}

export const Button = forwardRef<
  React.ComponentRef<typeof Pressable>,
  ButtonProps
>(
  (
    {
      size = "default",
      variant = "default",
      className,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    const bg = variant === "secondary" ? colors.secondary : colors.primary;

    return (
      <ButtonVariantContext.Provider value={variant}>
        <Pressable
          ref={ref}
          disabled={disabled}
          className={cn(
            "items-center justify-center rounded-xl",
            size === "sm" ? "h-10 px-4" : "h-12 px-5",
            className,
          )}
          style={(state) => [
            {
              backgroundColor: bg,
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
      className={cn("text-center", className)}
      style={[
        {
          fontFamily: fonts.sansMedium,
          fontSize: 15,
          color: variantForeground[variant],
        },
        style,
      ]}
      {...props}
    />
  );
}
