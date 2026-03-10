"use client";

import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailabilityOffer } from "@/lib/orpc/schemas";

const MAX_VISIBLE = 4;

const offerLabels: Record<string, string> = {
  flatrate: "Stream",
  rent: "Rent",
  buy: "Buy",
  free: "Free",
  ads: "With Ads",
};

function ProviderBadge({
  name,
  logoPath,
  watchUrl,
}: {
  name: string;
  logoPath: string | null;
  watchUrl: string | null;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        {...(watchUrl
          ? {
              render: (
                // biome-ignore lint/a11y/useAnchorContent: content is provided conditionally below
                <a href={watchUrl} target="_blank" rel="noopener noreferrer" />
              ),
            }
          : {})}
        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/30 bg-card motion-safe:transition-transform motion-safe:hover:scale-105${watchUrl ? "" : "cursor-default"}`}
      >
        {logoPath ? (
          <Image
            src={logoPath}
            alt={name}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-medium text-[8px] text-muted-foreground">
            {name.slice(0, 2)}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="bg-popover px-2 py-1 font-medium text-[10px] text-popover-foreground shadow-md [&>:last-child]:hidden">
        {watchUrl ? `Watch on ${name}` : name}
      </TooltipContent>
    </Tooltip>
  );
}

function OverflowProviderIcon({ offer }: { offer: AvailabilityOffer }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/20 bg-card">
      {offer.logoPath ? (
        <Image
          src={offer.logoPath}
          alt={offer.providerName}
          width={28}
          height={28}
          className="h-7 w-7 object-cover"
        />
      ) : (
        <span className="font-medium text-[7px] text-muted-foreground">
          {offer.providerName.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

function OverflowBadge({ offers }: { offers: AvailabilityOffer[] }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={0}
        closeDelay={300}
        className="flex h-10 w-10 cursor-default items-center justify-center rounded-lg border border-border/30 bg-card font-semibold text-muted-foreground text-xs motion-safe:transition-transform motion-safe:hover:scale-105"
      >
        +{offers.length}
      </PopoverTrigger>
      <PopoverContent className="flex w-auto max-w-64 flex-col gap-0 divide-y divide-border/30 p-0.5">
        {offers.map((offer) =>
          offer.watchUrl ? (
            <a
              key={offer.providerId}
              href={offer.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-muted/50"
            >
              <OverflowProviderIcon offer={offer} />
              <span className="truncate text-popover-foreground text-xs">
                {offer.providerName}
              </span>
            </a>
          ) : (
            <div
              key={offer.providerId}
              className="flex items-center gap-2.5 px-2 py-1.5"
            >
              <OverflowProviderIcon offer={offer} />
              <span className="truncate text-popover-foreground text-xs">
                {offer.providerName}
              </span>
            </div>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TitleAvailability({
  availability,
}: {
  availability: AvailabilityOffer[];
}) {
  const availByType: Record<string, AvailabilityOffer[]> = {};
  for (const offer of availability) {
    if (!availByType[offer.offerType]) availByType[offer.offerType] = [];
    availByType[offer.offerType].push(offer);
  }

  if (Object.keys(availByType).length === 0) return null;

  return (
    <div className="space-y-2 pt-1">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        Where to Watch
      </h2>
      <div className="flex flex-wrap gap-4">
        {Object.entries(availByType).map(([type, offers]) => {
          const visible = offers.slice(0, MAX_VISIBLE);
          const overflow = offers.slice(MAX_VISIBLE);

          return (
            <div key={type} className="space-y-1.5">
              <span className="font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                {offerLabels[type] ?? type}
              </span>
              <div className="flex gap-1.5">
                {visible.map((offer) => (
                  <ProviderBadge
                    key={offer.providerId}
                    name={offer.providerName}
                    logoPath={offer.logoPath}
                    watchUrl={offer.watchUrl}
                  />
                ))}
                {overflow.length > 0 && <OverflowBadge offers={overflow} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
