"use client";

import { IconCalendar, IconMapPin } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ResolvedPerson } from "@/lib/types/title";

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
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    const check = () => setIsClamped(el.scrollHeight > el.clientHeight);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const age = person.birthday
    ? calculateAge(person.birthday, person.deathday)
    : null;

  return (
    <div className="animate-stagger-item flex flex-col gap-6 sm:flex-row sm:gap-8">
      <div className="size-40 shrink-0 self-center overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl sm:size-56 sm:self-start">
        {person.profilePath ? (
          <Image
            src={person.profilePath}
            alt={person.name}
            width={500}
            height={500}
            className="h-full w-full object-cover"
            priority
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
        <h1 className="font-display text-3xl tracking-tight text-balance sm:text-5xl">
          {person.name}
        </h1>

        {person.knownForDepartment && (
          <Badge className="border-0 bg-primary/10 px-2.5 font-semibold uppercase tracking-wider text-primary">
            {person.knownForDepartment}
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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

        {person.biography && (
          <div className="max-w-3xl">
            <p
              ref={bioRef}
              className={`text-sm leading-relaxed text-muted-foreground ${
                !bioExpanded ? "line-clamp-3" : ""
              }`}
            >
              {person.biography}
            </p>
            {(isClamped || bioExpanded) && (
              <button
                type="button"
                onClick={() => setBioExpanded(!bioExpanded)}
                className="mt-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                {bioExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
