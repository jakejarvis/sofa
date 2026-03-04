"use client";

import type { Hotkey } from "@tanstack/react-hotkeys";
import { useHotkey } from "@tanstack/react-hotkeys";
import { getDefaultStore, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { commandPaletteOpenAtom } from "@/lib/atoms/command-palette";
import { titleTypeAtom, userStatusAtom } from "@/lib/atoms/title";
import { useTitleActions } from "./use-title-actions";

export function TitleKeyboardShortcuts() {
  const router = useRouter();
  const titleType = useAtomValue(titleTypeAtom);
  const userStatus = useAtomValue(userStatusAtom);
  const { handleStatusChange, handleRating, handleWatchMovie } =
    useTitleActions();

  const commandPaletteOpen = useAtomValue(commandPaletteOpenAtom, {
    store: getDefaultStore(),
  });
  const enabled = !commandPaletteOpen;

  // W: toggle watchlist (add if not in library, remove if in library)
  useHotkey("W", () => handleStatusChange(userStatus ? null : "watchlist"), {
    enabled,
  });
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
