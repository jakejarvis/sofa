import { useHotkey } from "@tanstack/react-hotkeys";
import { useAtomValue } from "jotai";

import { commandPaletteOpenAtom } from "@/lib/atoms/command-palette";
import { isOverlayOpen } from "@/lib/overlays";

import { useTitleContext, useTitleUserInfo } from "./title-context";
import { useTitleActions } from "./use-title-actions";

const whenNoOverlay = (fn: () => void) => () => {
  if (isOverlayOpen()) return;
  fn();
};

export function TitleKeyboardShortcuts() {
  const { titleType } = useTitleContext();
  const { userStatus } = useTitleUserInfo();
  const { handleStatusChange, handleRating, handleWatchMovie, handleUnwatchMovie } =
    useTitleActions();

  const commandPaletteOpen = useAtomValue(commandPaletteOpenAtom);
  const enabled = !commandPaletteOpen;

  // W: toggle watchlist (add if not in library, remove if in library)
  useHotkey(
    "W",
    whenNoOverlay(() => handleStatusChange(userStatus ? null : "watchlist")),
    {
      enabled,
    },
  );
  useHotkey(
    "M",
    whenNoOverlay(() => {
      if (titleType === "movie") {
        if (userStatus === "completed") {
          handleUnwatchMovie();
        } else {
          handleWatchMovie();
        }
      }
    }),
    { enabled },
  );
  useHotkey(
    "Escape",
    whenNoOverlay(() => window.history.back()),
    { enabled },
  );

  useHotkey(
    "1",
    whenNoOverlay(() => handleRating(1)),
    { enabled },
  );
  useHotkey(
    "2",
    whenNoOverlay(() => handleRating(2)),
    { enabled },
  );
  useHotkey(
    "3",
    whenNoOverlay(() => handleRating(3)),
    { enabled },
  );
  useHotkey(
    "4",
    whenNoOverlay(() => handleRating(4)),
    { enabled },
  );
  useHotkey(
    "5",
    whenNoOverlay(() => handleRating(5)),
    { enabled },
  );

  return null;
}
