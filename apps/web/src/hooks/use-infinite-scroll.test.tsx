import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";

import { useInfiniteScroll } from "./use-infinite-scroll";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function HorizontalRow({
  fetchNextPage,
  hasNextPage = true,
  isFetchingNextPage = false,
  isFetchNextPageError = false,
  rootMargin = "0px",
}: {
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
  rootMargin?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    rootRef: scrollRef,
    rootMargin,
  });

  return (
    <div
      ref={scrollRef}
      data-testid="scroller"
      style={{ width: 200, height: 50, overflowX: "auto", overflowY: "hidden" }}
    >
      <div style={{ display: "flex", width: 2000, height: 40 }}>
        <div style={{ flex: "1 1 auto" }} />
        <div ref={sentinelRef} style={{ width: 1, flexShrink: 0 }} />
      </div>
    </div>
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function mount(ui: React.ReactElement) {
  // The host stays inside the document viewport, so only the scroll container clips the sentinel.
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(ui);
  });
  return container;
}

function nextFrames(count = 3) {
  return act(async () => {
    for (let i = 0; i < count; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe("useInfiniteScroll with rootRef", () => {
  test("does not fetch while the sentinel is scrolled out of the container", async () => {
    const fetchNextPage = vi.fn<() => void>();
    mount(<HorizontalRow fetchNextPage={fetchNextPage} />);

    await nextFrames();

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  test("fetches once the container is scrolled to the sentinel", async () => {
    const fetchNextPage = vi.fn<() => void>();
    const host = mount(<HorizontalRow fetchNextPage={fetchNextPage} />);
    const scroller = host.querySelector<HTMLElement>("[data-testid=scroller]");
    expect(scroller).not.toBeNull();

    await nextFrames();
    expect(fetchNextPage).not.toHaveBeenCalled();

    scroller!.scrollLeft = scroller!.scrollWidth;

    await vi.waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
  });

  test("applies rootMargin relative to the scroll container, not the viewport", async () => {
    const fetchNextPage = vi.fn<() => void>();
    const host = mount(
      <HorizontalRow fetchNextPage={fetchNextPage} rootMargin="0px 100px 0px 0px" />,
    );
    const scroller = host.querySelector<HTMLElement>("[data-testid=scroller]");
    expect(scroller).not.toBeNull();

    await nextFrames();
    expect(fetchNextPage).not.toHaveBeenCalled();

    // The container shows x = 1750..1950 and the sentinel sits at x = 1999: still clipped,
    // but within the 100px margin. Only an observer rooted at the container fires here.
    scroller!.scrollLeft = 1750;

    await vi.waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
  });

  test("does not fetch when there is no next page", async () => {
    const fetchNextPage = vi.fn<() => void>();
    const host = mount(<HorizontalRow fetchNextPage={fetchNextPage} hasNextPage={false} />);
    const scroller = host.querySelector<HTMLElement>("[data-testid=scroller]");

    scroller!.scrollLeft = scroller!.scrollWidth;
    await nextFrames();

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  test("does not refetch after a failed page until the sentinel leaves and re-enters view", async () => {
    const fetchNextPage = vi.fn<() => void>();
    const host = mount(<HorizontalRow fetchNextPage={fetchNextPage} />);
    const scroller = host.querySelector<HTMLElement>("[data-testid=scroller]");
    expect(scroller).not.toBeNull();

    await nextFrames();
    scroller!.scrollLeft = scroller!.scrollWidth;
    await vi.waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));

    // The fetch starts, then fails; the sentinel is still on screen.
    act(() => {
      root?.render(<HorizontalRow fetchNextPage={fetchNextPage} isFetchingNextPage />);
    });
    await nextFrames();
    act(() => {
      root?.render(<HorizontalRow fetchNextPage={fetchNextPage} isFetchNextPageError />);
    });
    await nextFrames(5);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    // Scroll away, then back to the end: now it may fetch again.
    scroller!.scrollLeft = 0;
    await nextFrames(5);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    scroller!.scrollLeft = scroller!.scrollWidth;
    await vi.waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(2));
  });
});
