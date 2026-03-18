import { Trans, useLingui } from "@lingui/react/macro";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AvailabilityOffer } from "@sofa/api/schemas";

const MAX_VISIBLE = 4;

// offerLabels moved into component for LingUI

function ProviderBadge({
  name,
  logoPath,
  watchUrl,
}: {
  name: string;
  logoPath: string | null;
  watchUrl: string | null;
}) {
  const { t } = useLingui();
  return (
    <Tooltip>
      <TooltipTrigger
        {...(watchUrl
          ? {
              render: <a href={watchUrl} target="_blank" rel="noopener noreferrer" />,
            }
          : {})}
        className={`border-border/30 bg-card flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border motion-safe:transition-transform motion-safe:hover:scale-105${watchUrl ? "" : "cursor-default"}`}
      >
        {logoPath ? (
          <img
            src={logoPath}
            alt={name}
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-muted-foreground text-[8px] font-medium">{name.slice(0, 2)}</span>
        )}
      </TooltipTrigger>
      <TooltipContent className="bg-popover text-popover-foreground px-2 py-1 text-[10px] font-medium shadow-md [&>:last-child]:hidden">
        {watchUrl ? t`Watch on ${name}` : name}
      </TooltipContent>
    </Tooltip>
  );
}

function OverflowProviderIcon({ offer }: { offer: AvailabilityOffer }) {
  return (
    <div className="border-border/20 bg-card flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border">
      {offer.logoPath ? (
        <img
          src={offer.logoPath}
          alt={offer.providerName}
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="h-7 w-7 object-cover"
        />
      ) : (
        <span className="text-muted-foreground text-[7px] font-medium">
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
        className="border-border/30 bg-card text-muted-foreground flex h-10 w-10 cursor-default items-center justify-center rounded-lg border text-xs font-semibold motion-safe:transition-transform motion-safe:hover:scale-105"
      >
        +{offers.length}
      </PopoverTrigger>
      <PopoverContent className="divide-border/30 flex w-auto max-w-64 flex-col gap-0 divide-y p-0.5">
        {offers.map((offer) =>
          offer.watchUrl ? (
            <a
              key={offer.providerId}
              href={offer.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-muted/50 flex items-center gap-2.5 px-2 py-1.5"
            >
              <OverflowProviderIcon offer={offer} />
              <span className="text-popover-foreground truncate text-xs">{offer.providerName}</span>
            </a>
          ) : (
            <div key={offer.providerId} className="flex items-center gap-2.5 px-2 py-1.5">
              <OverflowProviderIcon offer={offer} />
              <span className="text-popover-foreground truncate text-xs">{offer.providerName}</span>
            </div>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TitleAvailability({ availability }: { availability: AvailabilityOffer[] }) {
  const { t } = useLingui();
  const offerLabels: Record<string, string> = {
    flatrate: t`Stream`,
    rent: t`Rent`,
    buy: t`Buy`,
    free: t`Free`,
    ads: t`With Ads`,
  };
  const availByType: Record<string, AvailabilityOffer[]> = {};
  for (const offer of availability) {
    if (!availByType[offer.offerType]) availByType[offer.offerType] = [];
    availByType[offer.offerType].push(offer);
  }

  if (Object.keys(availByType).length === 0) return null;

  return (
    <div className="space-y-2 pt-1">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        <Trans>Where to Watch</Trans>
      </h2>
      <div className="flex flex-wrap gap-4">
        {Object.entries(availByType).map(([type, offers]) => {
          const visible = offers.slice(0, MAX_VISIBLE);
          const overflow = offers.slice(MAX_VISIBLE);

          return (
            <div key={type} className="space-y-1.5">
              <span className="text-muted-foreground/60 text-[10px] font-medium tracking-wider uppercase">
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
