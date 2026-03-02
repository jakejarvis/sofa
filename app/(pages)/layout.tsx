"use client";

import { CommandPalette } from "@/components/command-palette";
import { KeyboardHelpDialog } from "@/components/keyboard-help-dialog";
import { KeyboardProvider } from "@/components/keyboard-provider";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NavBar } from "@/components/nav-bar";
import { Toaster } from "@/components/ui/sonner";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KeyboardProvider>
      <div className="min-h-screen overflow-x-hidden pb-14 sm:pb-0">
        <NavBar />
        {/* Ambient glow */}
        <div className="pointer-events-none fixed left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-primary/3 blur-[200px]" />
        <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette />
      <KeyboardHelpDialog />
      <Toaster position="bottom-right" />
    </KeyboardProvider>
  );
}
