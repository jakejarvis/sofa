import { useEffect, useRef } from "react";

export function useInfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError = false,
  rootRef,
  rootMargin = "200px",
}: {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** When the last next-page fetch failed, don't auto-refetch until the sentinel re-enters view. */
  isFetchNextPageError?: boolean;
  /** Scroll container to observe within. Defaults to the document viewport. */
  rootRef?: React.RefObject<HTMLElement | null>;
  rootMargin?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    let initialCallback = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // After a failed page, don't refetch just because the observer was re-created while the
        // sentinel is still on screen — wait for the user to scroll it out of and back into view.
        const skip = initialCallback && isFetchNextPageError;
        initialCallback = false;
        if (skip) return;
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: rootRef?.current ?? null, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, rootRef, rootMargin]);

  return sentinelRef;
}
