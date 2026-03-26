import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useState } from "react";

import { PlatformGrid } from "@/components/platforms/platform-grid";
import { RouteError } from "@/components/route-error";
import { Button } from "@/components/ui/button";
import { client, orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app/onboarding")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(orpc.discover.platforms.queryOptions());
  },
  head: () => ({ meta: [{ title: "Get Started — Sofa" }] }),
  errorComponent: RouteError,
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const platformsQuery = useQuery(orpc.discover.platforms.queryOptions());
  const platforms = platformsQuery.data?.platforms ?? [];

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  async function handleContinue() {
    setSaving(true);
    try {
      if (selectedIds.size > 0) {
        await client.account.updatePlatforms({ platformIds: [...selectedIds] });
      }
      void navigate({ to: "/dashboard" });
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    void navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-lg space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      >
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-medium text-balance">
            <Trans>What do you watch on?</Trans>
          </h1>
          <p className="text-muted-foreground text-sm text-balance">
            <Trans>Select your streaming services to personalize your experience</Trans>
          </p>
        </div>

        <PlatformGrid platforms={platforms} selectedIds={selectedIds} onToggle={handleToggle} />

        <div className="flex flex-col items-center gap-3">
          <Button onClick={handleContinue} disabled={saving} className="w-full max-w-xs">
            {saving ? <Trans>Saving…</Trans> : <Trans>Continue</Trans>}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <Trans>Skip for now</Trans>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
