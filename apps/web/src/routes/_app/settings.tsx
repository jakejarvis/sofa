import { Trans } from "@lingui/react/macro";
import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconFileImport,
  IconServer2,
  IconShieldLock,
  IconUser,
  IconWebhook,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

import { RouteError } from "@/components/route-error";
import { AccountSection } from "@/components/settings/account-section";
import { BackupRestoreSection } from "@/components/settings/backup-restore-section";
import { BackupScheduleSection } from "@/components/settings/backup-schedule-section";
import { BackupSection } from "@/components/settings/backup-section";
import { CacheSection } from "@/components/settings/danger-section";
import { ImportsSection } from "@/components/settings/imports-section";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { LanguageSection } from "@/components/settings/language-section";
import { RegistrationSection } from "@/components/settings/registration-section";
import { SettingsShell } from "@/components/settings/settings-shell";
import { StreamingServicesSection } from "@/components/settings/streaming-services-section";
import { SystemHealthCards } from "@/components/settings/system-health-section";
import { UpdateCheckSection } from "@/components/settings/update-check-section";
import { TmdbLogo } from "@/components/tmdb-logo";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

const GITHUB_REPO = "jakejarvis/sofa";

export const Route = createFileRoute("/_app/settings")({
  staleTime: 30_000,
  loader: async ({ context }) => {
    const promises: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(orpc.integrations.list.queryOptions()),
      context.queryClient.ensureQueryData(orpc.system.status.queryOptions()),
      context.queryClient.ensureQueryData(orpc.platforms.list.queryOptions()),
      context.queryClient.ensureQueryData(orpc.account.platforms.queryOptions()),
    ];
    const isAdmin = context.session.user.role === "admin";
    if (isAdmin) {
      promises.push(
        context.queryClient.ensureQueryData(orpc.admin.systemHealth.queryOptions()),
        context.queryClient.ensureQueryData(orpc.admin.backups.list.queryOptions()),
        context.queryClient.ensureQueryData(orpc.admin.backups.schedule.queryOptions()),
      );
    }
    await Promise.all(promises);
  },
  head: () => ({ meta: [{ title: "Settings — Sofa" }] }),
  pendingComponent: SettingsSkeleton,
  errorComponent: RouteError,
  component: SettingsPage,
});

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

function SettingsPage() {
  const { session } = Route.useRouteContext();
  const isAdmin = session.user.role === "admin";

  return (
    <SettingsShell>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <IconUser aria-hidden={true} className="text-muted-foreground size-4" />
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            <Trans>Account</Trans>
          </h2>
        </div>
        <div className="space-y-2.5">
          <AccountSection
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image || undefined,
              createdAt: new Date(session.user.createdAt).toISOString(),
              role: session.user.role ?? undefined,
            }}
          />
          <StreamingServicesSection />
          <LanguageSection />
        </div>
      </div>

      {/* Integrations */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <IconWebhook aria-hidden={true} className="text-muted-foreground size-4" />
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            <Trans>Integrations</Trans>
          </h2>
        </div>
        <IntegrationsSection />
      </div>

      {/* Import */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <IconFileImport aria-hidden className="text-muted-foreground size-4" />
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            <Trans>Import</Trans>
          </h2>
        </div>
        <ImportsSection />
      </div>

      {/* Server health */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconServer2 aria-hidden={true} className="text-muted-foreground size-4" />
            <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              <Trans>Server</Trans>
            </h2>
            <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              <Trans>Admin only</Trans>
            </span>
          </div>
          <SystemHealthCards />
        </div>
      )}

      {/* Security */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconShieldLock aria-hidden={true} className="text-muted-foreground size-4" />
            <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              <Trans>Security</Trans>
            </h2>
            <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              <Trans>Admin only</Trans>
            </span>
          </div>
          <div className="space-y-2.5">
            <Card className="border-s-primary/30 border-s-2">
              <RegistrationSection />
            </Card>
            <Card className="border-s-primary/30 border-s-2">
              <UpdateCheckSection />
            </Card>
          </div>
        </div>
      )}

      {/* Backups */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconDatabaseExport aria-hidden={true} className="text-muted-foreground size-4" />
            <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              <Trans>Backups</Trans>
            </h2>
            <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              <Trans>Admin only</Trans>
            </span>
          </div>
          <div className="space-y-2.5">
            <Card className="border-s-primary/30 border-s-2">
              <BackupSection />
            </Card>
            <Card className="border-s-primary/30 border-s-2">
              <BackupScheduleSection />
            </Card>
            <Card className="border-s-primary/30 border-s-2">
              <BackupRestoreSection />
            </Card>
          </div>
        </div>
      )}

      {/* Cache */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconAlertTriangle aria-hidden={true} className="text-destructive size-4" />
            <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              <Trans>Danger Zone</Trans>
            </h2>
            <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              <Trans>Admin only</Trans>
            </span>
          </div>
          <Card className="border-s-primary/30 border-s-2">
            <CacheSection />
          </Card>
        </div>
      )}

      <footer className="border-border/50 text-muted-foreground border-t pt-6 pb-2 text-center text-xs">
        <p>
          <a
            href="https://sofa.watch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/80 hover:text-primary font-medium transition-colors"
          >
            Sofa
          </a>{" "}
          v{__APP_VERSION__}
          {__GIT_COMMIT_SHA__ && (
            <>
              {" "}
              (
              <a
                href={`https://github.com/${GITHUB_REPO}/commit/${__GIT_COMMIT_SHA__}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary font-mono transition-colors"
              >
                {__GIT_COMMIT_SHA__}
              </a>
              )
            </>
          )}
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
          >
            <TmdbLogo className="h-3" />
          </a>
          <p className="text-muted-foreground text-[10px] leading-relaxed">
            <Trans>This product uses the TMDB API but is not endorsed or certified by TMDB.</Trans>
          </p>
        </div>
      </footer>
    </SettingsShell>
  );
}
