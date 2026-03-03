import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} overflow-x-hidden font-sans antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
