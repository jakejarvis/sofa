import { Provider as StoreProvider } from "jotai";
import { MotionConfig } from "motion/react";
import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sofa",
  description: "Track your movies and TV shows",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090706",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body
        className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} overflow-x-hidden font-sans antialiased`}
        style={{ touchAction: "manipulation" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <NuqsAdapter>
          <StoreProvider>
            <MotionConfig reducedMotion="user">
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster position="bottom-right" />
            </MotionConfig>
          </StoreProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
