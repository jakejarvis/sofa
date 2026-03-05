"use client";

import {
  IconDeviceTv,
  IconHome,
  IconKeyboard,
  IconMovie,
  IconSearch,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useAtom } from "jotai";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearch } from "@/hooks/use-search";
import {
  commandPaletteOpenAtom,
  helpOpenAtom,
  MAX_RECENT,
  recentSearchesAtom,
} from "@/lib/atoms/command-palette";
import { SHORTCUT_DESCRIPTIONS } from "@/lib/constants/shortcuts";

type SearchResult = ReturnType<typeof useSearch>["results"][number];

export function CommandPalette() {
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = useAtom(
    commandPaletteOpenAtom,
  );
  const [helpOpen, setHelpOpen] = useAtom(helpOpenAtom);
  const [recentSearches, setRecentSearches] = useAtom(recentSearchesAtom);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { results, isLoading: loading } = useSearch(debouncedQuery);
  const enabled = !commandPaletteOpen;

  useHotkey("Mod+K", () => setCommandPaletteOpen((prev) => !prev));
  useHotkey("/", () => setCommandPaletteOpen(true), { enabled });
  useHotkey({ key: "?", shift: true }, () => setHelpOpen(true), { enabled });
  useHotkeySequence(["G", "H"], () => router.push("/dashboard"), {
    enabled,
    timeout: 500,
  });
  useHotkeySequence(["G", "E"], () => router.push("/explore"), {
    enabled,
    timeout: 500,
  });

  // Reset query when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
    }
  }, [commandPaletteOpen]);

  // Save to recent searches when results arrive
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed && results.length > 0) {
      setRecentSearches((prev) => {
        const filtered = prev.filter((q) => q !== trimmed);
        return [trimmed, ...filtered].slice(0, MAX_RECENT);
      });
    }
  }, [debouncedQuery, results, setRecentSearches]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setCommandPaletteOpen(false);
      if (result.type === "person") {
        router.push(`/person/tmdb-${result.tmdbId}`);
      } else {
        router.push(`/titles/tmdb-${result.tmdbId}-${result.type}`);
      }
    },
    [router, setCommandPaletteOpen],
  );

  const handleRecentSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handleRemoveRecent = useCallback(
    (q: string) => {
      setRecentSearches((prev) => prev.filter((s) => s !== q));
    },
    [setRecentSearches],
  );

  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  const hasQuery = query.trim().length > 0;

  // Group shortcuts by scope for help dialog
  const grouped: Record<
    string,
    { description: string; keys: readonly string[] }[]
  > = {};
  for (const entry of SHORTCUT_DESCRIPTIONS) {
    if (!grouped[entry.scope]) grouped[entry.scope] = [];
    grouped[entry.scope].push(entry);
  }

  return (
    <>
      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search for movies, TV shows, or run commands
          </DialogDescription>
        </DialogHeader>
        <DialogContent
          className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0 sm:max-w-lg"
          showCloseButton={false}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search movies & TV shows..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-80">
              {hasQuery && loading && (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                    <div key={`skel-${i}`} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-8 shrink-0 rounded" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasQuery && !loading && results.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {hasQuery && !loading && results.length > 0 && (
                <CommandGroup heading="Results">
                  {results.map((r) => (
                    <CommandItem
                      key={`${r.type}-${r.tmdbId}`}
                      onSelect={() => handleSelect(r)}
                      className="flex items-center gap-3 py-2"
                    >
                      {r.type === "person" ? (
                        <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                          {r.profilePath ? (
                            <Image
                              src={r.profilePath as string}
                              alt={r.title}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <IconUser className="size-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
                          {r.posterPath ? (
                            <Image
                              src={r.posterPath as string}
                              alt={r.title}
                              width={32}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
                              ?
                            </div>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {r.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {r.type === "person" ? (
                            <IconUser className="size-[11px]" />
                          ) : r.type === "movie" ? (
                            <IconMovie className="size-[11px]" />
                          ) : (
                            <IconDeviceTv className="size-[11px]" />
                          )}
                          <span className="uppercase">{r.type}</span>
                          {r.type !== "person" && r.releaseDate && (
                            <span>{r.releaseDate.slice(0, 4)}</span>
                          )}
                          {r.type === "person" &&
                            r.knownFor &&
                            r.knownFor.length > 0 && (
                              <span className="truncate">
                                {r.knownFor.join(", ")}
                              </span>
                            )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!hasQuery && (
                <>
                  {recentSearches.length > 0 && (
                    <CommandGroup
                      heading={
                        <div className="flex items-center justify-between">
                          <span>Recent Searches</span>
                          <button
                            type="button"
                            onClick={handleClearRecent}
                            className="text-[10px] font-normal text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Clear all
                          </button>
                        </div>
                      }
                    >
                      {recentSearches.map((q) => (
                        <CommandItem
                          key={q}
                          onSelect={() => handleRecentSearch(q)}
                          className="group"
                        >
                          <IconSearch className="size-3.5 text-muted-foreground" />
                          <span className="flex-1">{q}</span>
                          <span
                            data-slot="command-shortcut"
                            className="ml-auto"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRecent(q);
                              }}
                              className="rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-data-[selected=true]:opacity-100"
                            >
                              <IconX className="size-3" />
                            </button>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {recentSearches.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Quick Actions">
                    <CommandItem
                      onSelect={() => {
                        setCommandPaletteOpen(false);
                        router.push("/dashboard");
                      }}
                    >
                      <IconHome className="size-3.5" />
                      Go to Dashboard
                      <CommandShortcut>G H</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        setCommandPaletteOpen(false);
                        router.push("/explore");
                      }}
                    >
                      <IconSearch className="size-3.5" />
                      Go to Explore
                      <CommandShortcut>G E</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        setCommandPaletteOpen(false);
                        setHelpOpen(true);
                      }}
                    >
                      <IconKeyboard className="size-3.5" />
                      Keyboard Shortcuts
                      <CommandShortcut>?</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {Object.entries(grouped).map(([scope, items]) => (
              <div key={scope} className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {scope}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between rounded-md px-2 py-1.5"
                    >
                      <span className="text-xs text-foreground">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, i) => (
                          <span key={key} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                then
                              </span>
                            )}
                            <Kbd>{formatKey(key)}</Kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatKey(key: string): string {
  const map: Record<string, string> = {
    " ": "Space",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  return map[key] ?? key.toUpperCase();
}
