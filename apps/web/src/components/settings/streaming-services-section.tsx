import { Trans, useLingui } from "@lingui/react/macro";
import { IconChevronDown, IconDeviceTv } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

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
                  <Trans>Streaming Services</Trans>
                </CardTitle>
                <CardDescription>
                  {selectedCount > 0 ? (
                    t`${selectedCount} selected`
                  ) : (
                    <Trans>Choose your subscriptions</Trans>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 4 }}
                    className="text-primary text-xs"
                  >
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
