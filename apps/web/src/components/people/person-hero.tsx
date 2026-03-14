import type { ResolvedPerson } from "@sofa/api/schemas";
import { IconCalendar, IconMapPin } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";

import { ExpandableText } from "@/components/expandable-text";
import { Badge } from "@/components/ui/badge";
import { thumbHashToUrl } from "@/lib/thumbhash";

interface PersonHeroProps {
  person: ResolvedPerson;
}

function calculateAge(birthday: string, deathday?: string | null): number {
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function PersonHero({ person }: PersonHeroProps) {
  const age = person.birthday
    ? calculateAge(person.birthday, person.deathday)
    : null;

  return (
    <div className="flex animate-stagger-item flex-col gap-6 sm:flex-row sm:gap-8">
      <div
        className="size-40 shrink-0 self-center overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 sm:size-56 sm:self-start"
        style={
          person.profileThumbHash
            ? {
                backgroundImage: `url(${thumbHashToUrl(person.profileThumbHash)})`,
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        {person.profilePath ? (
          <img
            src={person.profilePath}
            alt={person.name}
            width={500}
            height={500}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="font-display text-5xl text-muted-foreground/40">
              {person.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <h1 className="text-balance font-display text-3xl tracking-tight sm:text-5xl">
          {person.name}
        </h1>

        {person.knownForDepartment && (
          <Badge className="border-0 bg-primary/10 px-2.5 font-semibold text-primary uppercase tracking-wider">
            {person.knownForDepartment === "Acting"
              ? "Actor"
              : person.knownForDepartment === "Directing"
                ? "Director"
                : person.knownForDepartment === "Writing"
                  ? "Writer"
                  : person.knownForDepartment === "Production"
                    ? "Producer"
                    : person.knownForDepartment === "Editing"
                      ? "Editor"
                      : person.knownForDepartment}
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
          {person.birthday && (
            <span className="flex items-center gap-1.5">
              <IconCalendar aria-hidden={true} className="size-3.5" />
              {format(parseISO(person.birthday), "MMMM d, yyyy")}
              {age !== null && (
                <span className="text-muted-foreground/60">
                  ({person.deathday ? `died at ${age}` : `age ${age}`})
                </span>
              )}
            </span>
          )}
          {person.placeOfBirth && (
            <span className="flex items-center gap-1.5">
              <IconMapPin aria-hidden={true} className="size-3.5" />
              {person.placeOfBirth}
            </span>
          )}
        </div>

        {person.biography && <ExpandableText text={person.biography} />}
      </div>
    </div>
  );
}
