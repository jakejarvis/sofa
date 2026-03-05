import Link from "next/link";

export default function PersonNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-display text-4xl tracking-tight">Person not found</h1>
      <p className="text-muted-foreground">
        The person you&apos;re looking for doesn&apos;t exist or may have been
        removed.
      </p>
      <Link
        href="/explore"
        className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20"
      >
        Explore titles
      </Link>
    </div>
  );
}
