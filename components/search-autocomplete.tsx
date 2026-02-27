"use client";

import { IconSearch } from "@tabler/icons-react";
import { Command as CommandPrimitive } from "cmdk";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
  popularity: number;
  voteAverage: number;
}

interface SearchAutocompleteProps {
  onResults?: (results: SearchResult[]) => void;
  onLoading?: (loading: boolean) => void;
}

export function SearchAutocomplete({
  onResults,
  onLoading,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const [importing, setImporting] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      onResults?.([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    onLoading?.(true);
    const typeParam = filter !== "all" ? `&type=${filter}` : "";
    fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}${typeParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const res = data.results ?? [];
          setResults(res);
          onResults?.(res);
          setOpen(res.length > 0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          onLoading?.(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, filter, onResults, onLoading]);

  const handleImport = useCallback(
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
          toast.success(`Added "${result.title}" to library`);
          router.push(`/titles/${title.id}`);
        }
      } catch {
        toast.error("Failed to import title");
      } finally {
        setImporting(null);
      }
    },
    [router],
  );

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "movie", "tv"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === t
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {t === "all" ? "All" : t === "movie" ? "Movies" : "TV Shows"}
          </button>
        ))}
      </div>

      <div className="relative">
        <CommandPrimitive shouldFilter={false} className="w-full">
          <div className="relative">
            <IconSearch
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <CommandPrimitive.Input
              ref={inputRef}
              placeholder="Search movies & TV shows..."
              value={query}
              onValueChange={(val) => {
                setQuery(val);
                if (val.trim()) setOpen(true);
              }}
              onFocus={() => {
                if (results.length > 0) setOpen(true);
              }}
              onBlur={() => {
                // Delay to allow click on result
                setTimeout(() => setOpen(false), 200);
              }}
              className="flex h-13 w-full rounded-xl border border-border/50 bg-card/50 pl-11 pr-4 text-base backdrop-blur-sm transition-all placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {open && results.length > 0 && (
            <CommandPrimitive.List className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-border/50 bg-popover/95 p-1 shadow-xl shadow-black/30 backdrop-blur-xl">
              {results.map((r) => (
                <CommandPrimitive.Item
                  key={`${r.type}-${r.tmdbId}`}
                  value={`${r.type}-${r.tmdbId}`}
                  onSelect={() => handleImport(r)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-accent"
                >
                  <div className="h-[60px] w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {r.posterPath ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                        alt={r.title}
                        width={40}
                        height={60}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {r.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {r.releaseDate && (
                        <span>{r.releaseDate.slice(0, 4)}</span>
                      )}
                      {r.voteAverage > 0 && (
                        <span className="text-primary">
                          ★ {r.voteAverage.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {r.overview && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
                        {r.overview}
                      </p>
                    )}
                  </div>
                  {importing === r.tmdbId && (
                    <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.List>
          )}
        </CommandPrimitive>
      </div>
    </div>
  );
}
