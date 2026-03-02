"use client";

import {
  IconDeviceTv,
  IconHome,
  IconKeyboard,
  IconMovie,
  IconSearch,
} from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useKeyboard } from "@/components/keyboard-provider";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

const RECENT_KEY = "cp:recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function CommandPalette() {
  const router = useRouter();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setHelpOpen,
    registerShortcut,
  } = useKeyboard();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  // Register global shortcuts
  useEffect(() => {
    registerShortcut("cmd-palette-slash", {
      keys: ["/"],
      description: "Search",
      action: () => setCommandPaletteOpen(true),
      scope: "Global",
    });
    registerShortcut("cmd-palette-help", {
      keys: ["?"],
      description: "Keyboard shortcuts",
      action: () => setHelpOpen(true),
      scope: "Global",
    });
    registerShortcut("nav-home", {
      keys: ["g", "h"],
      description: "Go to dashboard",
      action: () => router.push("/dashboard"),
      scope: "Navigation",
    });
    registerShortcut("nav-explore", {
      keys: ["g", "e"],
      description: "Go to explore",
      action: () => router.push("/explore"),
      scope: "Navigation",
    });
  }, [registerShortcut, setCommandPaletteOpen, setHelpOpen, router]);

  // Load recent searches when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setResults([]);
    }
  }, [commandPaletteOpen]);

  // Search TMDB
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults((data.results ?? []).slice(0, 8));
          addRecentSearch(debouncedQuery.trim());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      setImporting(result.tmdbId);
      try {
        const res = await fetch("/api/titles/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: result.tmdbId, type: result.type }),
        });
        const title = await res.json();
        if (title.id) {
          setCommandPaletteOpen(false);
          router.push(`/titles/${title.id}`);
        }
      } finally {
        setImporting(null);
      }
    },
    [router, setCommandPaletteOpen],
  );

  const handleRecentSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const hasQuery = query.trim().length > 0;

  return (
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
                    disabled={importing === r.tmdbId}
                    className="flex items-center gap-3 py-2"
                  >
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{r.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {r.type === "movie" ? (
                          <IconMovie size={11} />
                        ) : (
                          <IconDeviceTv size={11} />
                        )}
                        <span className="uppercase">{r.type}</span>
                        {r.releaseDate && (
                          <span>{r.releaseDate.slice(0, 4)}</span>
                        )}
                      </div>
                    </div>
                    {importing === r.tmdbId && (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!hasQuery && (
              <>
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.map((q) => (
                      <CommandItem
                        key={q}
                        onSelect={() => handleRecentSearch(q)}
                      >
                        <IconSearch
                          size={14}
                          className="text-muted-foreground"
                        />
                        {q}
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
                    <IconHome size={14} />
                    Go to Dashboard
                    <CommandShortcut>G H</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setCommandPaletteOpen(false);
                      router.push("/explore");
                    }}
                  >
                    <IconSearch size={14} />
                    Go to Explore
                    <CommandShortcut>G E</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setCommandPaletteOpen(false);
                      setHelpOpen(true);
                    }}
                  >
                    <IconKeyboard size={14} />
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
  );
}
