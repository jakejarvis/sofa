import { useHotkey } from "@tanstack/react-hotkeys";
import { useAtomValue } from "jotai";

import { commandPaletteOpenAtom } from "@/lib/atoms/command-palette";

import { useTitleContext, useTitleUserInfo } from "./title-context";
import { useTitleActions } from "./use-title-actions";

export function TitleKeyboardShortcuts() {
  const { titleType } = useTitleContext();
  const { userStatus } = useTitleUserInfo();
  const { handleStatusChange, handleRating, handleWatchMovie } = useTitleActions();

  const commandPaletteOpen = useAtomValue(commandPaletteOpenAtom);
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
  useHotkey("Escape", () => window.history.back(), { enabled });

  useHotkey("1", () => handleRating(1), { enabled });
  useHotkey("2", () => handleRating(2), { enabled });
  useHotkey("3", () => handleRating(3), { enabled });
  useHotkey("4", () => handleRating(4), { enabled });
  useHotkey("5", () => handleRating(5), { enabled });

  return null;
}
