"use client";

import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailabilityOffer } from "@/lib/types/title";

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
}: {
  name: string;
  logoPath: string | null;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/30 bg-card transition-transform hover:scale-105">
        {logoPath ? (
          <Image
            src={logoPath}
            alt={name}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[8px] font-medium text-muted-foreground">
            {name.slice(0, 2)}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-md [&>:last-child]:bg-popover [&>:last-child]:fill-popover">
        {name}
      </TooltipContent>
    </Tooltip>
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
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Where to Watch
      </h3>
      <div className="flex flex-wrap gap-4">
        {Object.entries(availByType).map(([type, offers]) => (
          <div key={type} className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {offerLabels[type] ?? type}
            </span>
            <div className="flex gap-1.5">
              {offers.map((offer) => (
                <ProviderBadge
                  key={offer.providerId}
                  name={offer.providerName}
                  logoPath={offer.logoPath}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
