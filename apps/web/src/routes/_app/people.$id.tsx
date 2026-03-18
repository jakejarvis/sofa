import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PersonDetailClient,
  PersonDetailSkeleton,
} from "@/components/people/person-detail-client";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app/people/$id")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureInfiniteQueryData(
      orpc.people.detail.infiniteOptions({
        input: (pageParam: number) => ({
          id: params.id,
          page: pageParam,
          limit: 20,
        }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      }),
    );
  },
  head: ({ loaderData: _loaderData, params: _params }) => {
    // Title is set by the component after data loads
    return {};
  },
  pendingComponent: () => <PersonDetailSkeleton />,
  notFoundComponent: PersonNotFound,
  component: PersonPage,
});

function PersonPage() {
  const { id } = Route.useParams();
  return <PersonDetailClient id={id} />;
}

function PersonNotFound() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1
        className="animate-stagger-item font-display text-[6rem] text-foreground/[0.06] leading-[0.85] tracking-tight sm:text-[8rem]"
        style={{ "--stagger-index": 0 } as React.CSSProperties}
      >
        404
      </h1>
      <div
        className="-mt-4 animate-stagger-item space-y-2"
        style={{ "--stagger-index": 1 } as React.CSSProperties}
      >
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
          <Trans>Person not found</Trans>
        </h2>
        <p className="mx-auto max-w-sm text-muted-foreground text-sm leading-relaxed">
          <Trans>
            The person you&apos;re looking for doesn&apos;t exist or may have
            been removed from the database.
          </Trans>
        </p>
      </div>
      <div
        className="flex animate-stagger-item items-center gap-3"
        style={{ "--stagger-index": 2 } as React.CSSProperties}
      >
        <Link
          to="/explore"
          className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-lg bg-primary px-5 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-lg hover:shadow-primary/20"
        >
          <span className="relative z-10">
            <Trans>Explore titles</Trans>
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 font-medium text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Trans>Dashboard</Trans>
        </Link>
      </div>
    </div>
  );
}
