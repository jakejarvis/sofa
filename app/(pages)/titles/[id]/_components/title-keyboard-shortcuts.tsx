"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useRegisterShortcut } from "@/hooks/use-register-shortcut";
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

  const nextStatus = useMemo(() => {
    const currentIdx = statusCycle.indexOf(
      userStatus as (typeof statusCycle)[number],
    );
    return currentIdx === statusCycle.length - 1
      ? null
      : statusCycle[currentIdx + 1];
  }, [userStatus]);

  useRegisterShortcut("title-cycle-status", {
    keys: ["w"],
    description: "Cycle status",
    action: () => handleStatusChange(nextStatus),
    scope: "Title",
  });

  useRegisterShortcut("title-mark-watched", {
    keys: ["m"],
    description: "Mark watched",
    action: () => {
      if (titleType === "movie") handleWatchMovie();
    },
    scope: "Title",
  });

  useRegisterShortcut("title-escape", {
    keys: ["Escape"],
    description: "Go back",
    action: () => router.back(),
    scope: "Title",
  });

  // Rating shortcuts 1-5
  for (const n of [1, 2, 3, 4, 5]) {
    // biome-ignore lint/correctness/useHookAtTopLevel: loop is stable
    useRegisterShortcut(`title-rate-${n}`, {
      keys: [String(n)],
      description: `Rate ${n} star${n > 1 ? "s" : ""}`,
      action: () => handleRating(n),
      scope: "Title",
    });
  }

  return null;
}
