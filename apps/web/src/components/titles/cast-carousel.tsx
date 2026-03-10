import type { CastMember } from "@sofa/api/schemas";
import { IconUser, IconUsers } from "@tabler/icons-react";

import { Link } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CastCarouselProps {
  actors: CastMember[];
  titleType: "movie" | "tv";
}

export function CastCarousel({ actors, titleType }: CastCarouselProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <IconUsers aria-hidden={true} className="size-5 text-primary" />
        <h2 className="font-display text-xl tracking-tight">Cast</h2>
      </div>

      {actors.length > 0 && (
        <ScrollArea scrollFade hideScrollbar className="-mx-4 sm:-mx-0">
          <div className="flex gap-1 px-4 py-2 sm:px-0">
            {actors.map((member, i) => (
              <div key={member.id} className="w-[100px] shrink-0 sm:w-[120px]">
                <div
                  className="animate-stagger-item"
                  style={{ "--stagger-index": i } as React.CSSProperties}
                >
                  <Link
                    to="/people/$id"
                    params={{ id: member.personId }}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="size-20 overflow-hidden rounded-full ring-1 ring-white/10 transition-all group-hover:ring-primary/25 sm:size-24">
                      {member.profilePath ? (
                        <img
                          src={member.profilePath}
                          alt={member.name}
                          width={96}
                          height={96}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover motion-safe:transition-transform motion-safe:group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <IconUser
                            aria-hidden={true}
                            className="size-8 text-muted-foreground/50"
                          />
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center">
                      <p className="truncate font-medium text-xs">
                        {member.name}
                      </p>
                      {member.character && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {member.character}
                        </p>
                      )}
                      {titleType === "tv" && member.episodeCount && (
                        <p className="text-[10px] text-muted-foreground/70">
                          {member.episodeCount} ep
                          {member.episodeCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
