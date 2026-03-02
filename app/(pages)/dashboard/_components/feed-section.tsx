"use client";

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
        {icon}
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
