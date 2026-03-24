import { Trans, useLingui } from "@lingui/react/macro";
import { IconChevronLeft, IconChevronRight, IconDots } from "@tabler/icons-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(className)}
      nativeButton={false}
      render={
        // oxlint-disable-next-line jsx-a11y/anchor-has-content -- content is provided by the Button's children
        <a
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  );
}

function PaginationPrevious({
  className,
  text,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  const { t } = useLingui();
  return (
    <PaginationLink
      aria-label={t`Go to previous page`}
      size="default"
      className={cn("ps-2!", className)}
      {...props}
    >
      <IconChevronLeft data-icon="inline-start" />
      <span className="hidden sm:block">{text ?? t`Previous`}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  const { t } = useLingui();
  return (
    <PaginationLink
      aria-label={t`Go to next page`}
      size="default"
      className={cn("pe-2!", className)}
      {...props}
    >
      <span className="hidden sm:block">{text ?? t`Next`}</span>
      <IconChevronRight data-icon="inline-end" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-7 items-center justify-center [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <IconDots />
      <span className="sr-only">
        <Trans>More pages</Trans>
      </span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
