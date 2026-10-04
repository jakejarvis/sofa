import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { useCallback } from "react";

import { recentSearchesAtom } from "@/lib/atoms/command-palette";

/**
 * Drop everything cached for the current user. Query keys are not scoped by
 * user, so this must run on sign-out and before entering the app after sign-in.
 */
export function useResetUserState() {
  const queryClient = useQueryClient();
  const setRecentSearches = useSetAtom(recentSearchesAtom);
  return useCallback(() => {
    queryClient.clear();
    setRecentSearches(RESET);
  }, [queryClient, setRecentSearches]);
}
