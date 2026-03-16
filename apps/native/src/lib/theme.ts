import { DarkTheme } from "@react-navigation/native";

export const sofaTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#000000", // --color-background pure black (OLED)
    card: "#171310", // --color-card        oklch(0.19 0.008 55)
    text: "#ede7dd", // --color-foreground  oklch(0.93 0.015 80)
    border: "#282320", // --color-border      approximate
    primary: "#fba952", // --color-primary     oklch(0.8 0.14 65)
    notification: "#fba952", // --color-primary
  },
};
