import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";

interface SofaLogoProps {
  size?: number;
  color?: string;
}

export function SofaLogo({ size = 24, color }: SofaLogoProps) {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const fill = color ?? primaryColor;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={fill}
        d="M7 12v1h10v-1a3 3 0 0 1 2.993-3a4.6 4.6 0 0 0-.07-.78a4 4 0 0 0-3.143-3.143C16.394 5 15.93 5 15 5H9c-.93 0-1.394 0-1.78.077A4 4 0 0 0 4.077 8.22a4.6 4.6 0 0 0-.07.78A3 3 0 0 1 7 12"
      />
      <Path
        fill={fill}
        d="M18.444 18H5.556a3.6 3.6 0 0 1-.806-.092V19a.75.75 0 0 1-1.5 0v-1.849A3.55 3.55 0 0 1 2 14.444V12a2 2 0 1 1 4 0v1.2a.8.8 0 0 0 .8.8h10.4a.8.8 0 0 0 .8-.8V12a2 2 0 1 1 4 0v2.444a3.55 3.55 0 0 1-1.25 2.707V19a.75.75 0 0 1-1.5 0v-1.092a3.6 3.6 0 0 1-.806.092"
      />
    </Svg>
  );
}
