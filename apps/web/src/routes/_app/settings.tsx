import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconServer2,
  IconShieldLock,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSection } from "@/components/settings/account-section";
import { BackupRestoreSection } from "@/components/settings/backup-restore-section";
import { BackupScheduleSection } from "@/components/settings/backup-schedule-section";
import { BackupSection } from "@/components/settings/backup-section";
import { CacheSection } from "@/components/settings/danger-section";
import { ImportsSection } from "@/components/settings/imports-section";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { RegistrationSection } from "@/components/settings/registration-section";
import { SettingsShell } from "@/components/settings/settings-shell";
import { SystemHealthCards } from "@/components/settings/system-health-section";
import { UpdateCheckSection } from "@/components/settings/update-check-section";
import { TmdbLogo } from "@/components/tmdb-logo";
import { Card } from "@/components/ui/card";

const GITHUB_REPO = "jakejarvis/sofa";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = Route.useRouteContext();
  const isAdmin = session.user.role === "admin";

  return (
    <SettingsShell
      footer={
        <footer className="border-border/50 border-t pt-6 pb-2 text-center text-muted-foreground text-xs">
          <p>
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary/80 transition-colors hover:text-primary"
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
                  className="font-mono transition-colors hover:text-primary"
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
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>
        </footer>
      }
    >
      <AccountSection
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image || undefined,
          createdAt: new Date(session.user.createdAt).toISOString(),
          role: session.user.role ?? undefined,
        }}
      />

      <IntegrationsSection />

      <ImportsSection />

      {/* Server health */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconServer2
              aria-hidden={true}
              className="size-4 text-muted-foreground"
            />
            <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Server
            </h2>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
              Admin only
            </span>
          </div>
          <SystemHealthCards />
        </div>
      )}

      {/* Security */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconShieldLock
              aria-hidden={true}
              className="size-4 text-muted-foreground"
            />
            <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Security
            </h2>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
              Admin only
            </span>
          </div>
          <div className="space-y-3">
            <Card className="border-l-2 border-l-primary/30">
              <RegistrationSection />
            </Card>
            <Card className="border-l-2 border-l-primary/30">
              <UpdateCheckSection />
            </Card>
          </div>
        </div>
      )}

      {/* Backups */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconDatabaseExport
              aria-hidden={true}
              className="size-4 text-muted-foreground"
            />
            <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Backups
            </h2>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
              Admin only
            </span>
          </div>
          <div className="space-y-3">
            <Card className="border-l-2 border-l-primary/30">
              <BackupSection />
            </Card>
            <Card className="border-l-2 border-l-primary/30">
              <BackupScheduleSection />
            </Card>
            <Card className="border-l-2 border-l-primary/30">
              <BackupRestoreSection />
            </Card>
          </div>
        </div>
      )}

      {/* Cache */}
      {isAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <IconAlertTriangle
              aria-hidden={true}
              className="size-4 text-destructive"
            />
            <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Danger Zone
            </h2>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
              Admin only
            </span>
          </div>
          <Card className="border-l-2 border-l-primary/30">
            <CacheSection />
          </Card>
        </div>
      )}
    </SettingsShell>
  );
}
