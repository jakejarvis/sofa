"use client";

import type { Hotkey } from "@tanstack/react-hotkeys";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { commandPaletteOpenAtom } from "@/lib/atoms/command-palette";
import { useTitleInteraction } from "./title-interaction-provider";

const statusCycle = ["watchlist", "in_progress", "completed"] as const;

export function TitleKeyboardShortcuts() {
  const router = useRouter();
  const {
    titleType,
    userStatus,
    handleStatusChange,
    handleRating,
    handleWatchMovie,
  } = useTitleInteraction();

  const commandPaletteOpen = useAtomValue(commandPaletteOpenAtom);
  const enabled = !commandPaletteOpen;

  const nextStatus = useMemo(() => {
    const currentIdx = statusCycle.indexOf(
      userStatus as (typeof statusCycle)[number],
    );
    return currentIdx === statusCycle.length - 1
      ? null
      : statusCycle[currentIdx + 1];
  }, [userStatus]);

  useHotkey("W", () => handleStatusChange(nextStatus), { enabled });
  useHotkey(
    "M",
    () => {
      if (titleType === "movie") handleWatchMovie();
    },
    { enabled },
  );
  useHotkey("Escape", () => router.back(), { enabled });

  for (const n of [1, 2, 3, 4, 5]) {
    // biome-ignore lint/correctness/useHookAtTopLevel: loop is stable (always 5 iterations)
    useHotkey(String(n) as Hotkey, () => handleRating(n), { enabled });
  }

  return null;
}
