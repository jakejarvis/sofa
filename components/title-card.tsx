import Image from "next/image";
import Link from "next/link";

interface TitleCardProps {
  id?: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  href?: string;
  onImport?: () => void;
}

export function TitleCard({
  id,
  type,
  title,
  posterPath,
  releaseDate,
  voteAverage,
  href,
  onImport,
}: TitleCardProps) {
  const year = releaseDate?.slice(0, 4);
  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w300${posterPath}`
    : null;

  const content = (
    <div className="group relative overflow-hidden rounded-lg transition-transform duration-200 hover:scale-[1.02]">
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-card">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            width={300}
            height={450}
            className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-card to-muted text-sm text-muted-foreground">
            No poster
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">
            {type}
          </span>
          {year && <span>{year}</span>}
          {voteAverage != null && voteAverage > 0 && (
            <span className="text-amber">★ {voteAverage.toFixed(1)}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (href || id) {
    return <Link href={href ?? `/titles/${id}`}>{content}</Link>;
  }

  if (onImport) {
    return (
      <button type="button" onClick={onImport} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
