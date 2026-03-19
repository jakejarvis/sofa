import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function FeedSection({
  title,
  icon,
  children,
  seeAllLink,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  seeAllLink?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden={true}>{icon}</span>
          <h2 className="font-display text-xl tracking-tight text-balance">{title}</h2>
        </div>
        {seeAllLink && (
          <Link to={seeAllLink} className="text-primary text-sm hover:underline">
            <Trans>See all</Trans>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
