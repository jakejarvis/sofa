import { IconDeviceTv } from "@tabler/icons-react";
import Link from "next/link";
import { getUserStats } from "@/lib/services/discovery";
import { StatsDisplay } from "./stats-display";

export async function StatsSection({ userId }: { userId: string }) {
  const stats = await getUserStats(userId);

  const isEmpty =
    stats.moviesThisMonth === 0 &&
    stats.episodesThisWeek === 0 &&
    stats.librarySize === 0 &&
    stats.completed === 0;

  return (
    <>
      <StatsDisplay stats={stats} />
      {isEmpty && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/50 py-16 text-center">
          <div className="animate-gentle-float rounded-full bg-primary/10 p-4">
            <IconDeviceTv size={32} className="text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Your library is empty</p>
            <p className="text-sm text-muted-foreground">
              Search for movies and TV shows to start tracking
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20"
          >
            Start exploring
          </Link>
        </div>
      )}
    </>
  );
}
