import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./global.css";

export const metadata: Metadata = {
  title: {
    default: "Sofa — Self-hosted movie & TV tracker",
    template: "%s | Sofa",
  },
  description:
    "Track movies and TV shows on your own server. Episode-level progress, media server sync, and a single Docker container.",
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${dmSerifDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-[family-name:var(--font-dm-sans)]">
        <RootProvider theme={{ forcedTheme: "dark" }}>{children}</RootProvider>
      </body>
    </html>
  );
}
