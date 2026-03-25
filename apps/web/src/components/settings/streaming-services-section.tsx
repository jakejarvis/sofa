import { Trans, useLingui } from "@lingui/react/macro";
import { IconChevronDown, IconCircleCheck, IconDeviceTv } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { SVGProps, useCallback, useEffect, useRef, useState } from "react";

import { PlatformGrid } from "@/components/platforms/platform-grid";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { client, orpc } from "@/lib/orpc/client";

export function StreamingServicesSection() {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedIdsRef = useRef<Set<string>>(selectedIds);
  const saveCounterRef = useRef(0);
  const initialized = useRef(false);

  const platformsQuery = useQuery(orpc.platforms.list.queryOptions());
  const userPlatformsQuery = useQuery(orpc.account.platforms.queryOptions());

  // Initialize selected IDs from server data
  useEffect(() => {
    if (userPlatformsQuery.data && !initialized.current) {
      const ids = new Set(userPlatformsQuery.data.platformIds);
      setSelectedIds(ids);
      selectedIdsRef.current = ids;
      initialized.current = true;
    }
  }, [userPlatformsQuery.data]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const save = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    const counter = ++saveCounterRef.current;
    saveTimerRef.current = setTimeout(async () => {
      const ids = selectedIdsRef.current;
      await client.account.updatePlatforms({ platformIds: [...ids] });
      // Only show "Saved" if no newer save was triggered
      if (saveCounterRef.current !== counter) return;
      setSaved(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(setSaved, 1500, false);
    }, 500);
  }, []);

  const handleToggle = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        selectedIdsRef.current = next;
        save();
        return next;
      });
    },
    [save],
  );

  const platforms = platformsQuery.data?.platforms ?? [];
  const selectedCount = selectedIds.size;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className={open ? "pb-4" : ""}>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <IconDeviceTv className="text-primary size-4" />
              </div>
              <div className="text-start">
                <CardTitle>
                  <Trans>Subscriptions</Trans>
                </CardTitle>
                <CardDescription>
                  {selectedCount > 0 ? (
                    t`${selectedCount} selected`
                  ) : (
                    <Trans>Choose your preferred streaming platforms</Trans>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 4 }}
                    className="text-primary flex items-center gap-1.5 text-xs"
                  >
                    <IconCircleCheck className="size-3.5" />
                    <Trans>Saved</Trans>
                  </motion.span>
                )}
              </AnimatePresence>
              <IconChevronDown
                aria-hidden={true}
                className={`text-muted-foreground size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <CardContent className="border-border/30 border-t pt-4">
            <PlatformGrid platforms={platforms} selectedIds={selectedIds} onToggle={handleToggle} />
            <div className="text-muted-foreground mt-4 text-center text-xs">
              <a
                href="https://justwatch.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                <Trans>
                  Streaming data provided by{" "}
                  <JustWatchLogo
                    className="mx-0.5 inline-block size-3.5 translate-y-[-1px] text-[#FBD446]"
                    aria-hidden={true}
                  />
                  <span className="font-semibold">JustWatch</span>
                </Trans>
              </a>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function JustWatchLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      {/* Icon from Custom Brand Icons by Emanuele & rchiileea - https://github.com/elax46/custom-brand-icons/blob/main/LICENSE */}
      <path
        fill="currentColor"
        d="M11.727 11.7L8.1 9.85s-.646-.344-.617.38s0 3.591 0 3.591s-.1.767.612.427s3.094-1.571 3.627-1.841c.715-.367.005-.707.005-.707m-.006 5.023l-3.628-1.854s-.647-.345-.618.38s0 3.591 0 3.591s-.1.768.613.427s3.093-1.571 3.626-1.841c.717-.367.007-.703.007-.703m4.953-2.464l-3.628-1.854s-.647-.344-.617.38s-.005 3.591-.005 3.591s-.1.768.612.427s3.094-1.57 3.626-1.841c.722-.362.012-.703.012-.703m4.205-2.918L17.844 9.8c-.506-.257-.457.333-.457.333v3.824s-.054.564.468.3l3.025-1.526c1.398-.702-.001-1.39-.001-1.39m-4.203-2.229l-3.629-1.855s-.647-.343-.617.38s0 3.592 0 3.592s-.1.767.612.427s3.094-1.571 3.626-1.841c.717-.367.008-.703.008-.703M7.012 4.257s-1.494-.74-2.945-1.479s-1.539.693-1.539.693v3.128c0 .369.373.217.373.217s3.7-1.886 4.113-2.1s-.002-.459-.002-.459m1.071 4.924c.715-.34 3.094-1.57 3.626-1.841c.722-.366.013-.7.013-.7L8.093 4.783s-.646-.344-.618.38s0 3.591 0 3.591s-.107.768.608.427m-4.961 2.573c.716-.341 3.094-1.571 3.626-1.841c.723-.367.013-.7.013-.7L3.133 7.355s-.647-.343-.618.38s-.005 3.592-.005 3.592s-.103.767.612.427m-.005 4.954c.716-.34 3.094-1.57 3.627-1.841c.722-.366.012-.7.012-.7L3.128 12.31s-.647-.343-.618.38s0 3.591 0 3.591v.101c-.01.196.058.588.607.326M7 19.334c-.418-.216-4.115-2.1-4.115-2.1s-.374-.151-.373.218l.006 3.128s.09 1.434 1.54.692S7 19.791 7 19.791s.415-.24 0-.457"
      />
    </svg>
  );
}
