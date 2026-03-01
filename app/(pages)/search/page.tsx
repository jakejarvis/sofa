"use client";

import { IconDeviceTv, IconMovie } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { TitleCard } from "@/components/title-card";

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

export default function SearchPage() {
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);

  const handleResults = useCallback((res: SearchResult[]) => {
    setResults(res);
    if (res.length > 0) setSearched(true);
  }, []);

  const handleLoading = useCallback((l: boolean) => {
    setLoading(l);
    if (l) setSearched(true);
  }, []);

  async function handleOpen(tmdbId: number, type: "movie" | "tv") {
    setImporting(tmdbId);
    try {
      const res = await fetch("/api/titles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/titles/${data.id}`);
      }
    } catch {
      toast.error("Failed to load title");
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find movies and TV shows to track
        </p>
      </div>

      <SearchAutocomplete onResults={handleResults} onLoading={handleLoading} />

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex gap-2 text-muted-foreground/40">
            <IconMovie size={32} />
            <IconDeviceTv size={32} />
          </div>
          <p className="text-muted-foreground">No results found</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((r) => (
            <div key={`${r.type}-${r.tmdbId}`} className="relative">
              <TitleCard
                tmdbId={r.tmdbId}
                type={r.type}
                title={r.title}
                posterPath={r.posterPath}
                releaseDate={r.releaseDate}
                voteAverage={r.voteAverage}
                onImport={() => handleOpen(r.tmdbId, r.type)}
              />
              {importing === r.tmdbId && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm font-medium text-primary">
                      Loading
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
