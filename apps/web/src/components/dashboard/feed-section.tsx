import type { ReactNode } from "react";

export function FeedSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span aria-hidden={true}>{icon}</span>
        <h2 className="font-display text-xl tracking-tight text-balance">{title}</h2>
      </div>
      {children}
    </section>
  );
}
