import {
  IconDatabaseExport,
  IconServer2,
  IconShieldLock,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { TmdbLogo } from "@/components/tmdb-logo";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { AccountSection } from "./_components/account-section";
import { BackupRestoreSection } from "./_components/backup-restore-section";
import { BackupScheduleSection } from "./_components/backup-schedule-section";
import { BackupSection } from "./_components/backup-section";
import { IntegrationsSection } from "./_components/integrations-section";
import { RegistrationSection } from "./_components/registration-section";
import { SettingsShell } from "./_components/settings-shell";
import { SystemHealthCards } from "./_components/system-health-section";
import { UpdateCheckSection } from "./_components/update-check-section";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";

  const GITHUB_REPO = "jakejarvis/sofa";
  const APP_VERSION = process.env.APP_VERSION || "0.0.0";
  const GIT_COMMIT_SHA = process.env.GIT_COMMIT_SHA?.slice(0, 7) || "";

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
            v{APP_VERSION}
            {GIT_COMMIT_SHA && (
              <>
                {" "}
                (
                <a
                  href={`https://github.com/${GITHUB_REPO}/commit/${GIT_COMMIT_SHA}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono transition-colors hover:text-primary"
                >
                  {GIT_COMMIT_SHA}
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
          createdAt: session.user.createdAt.toISOString(),
          role: session.user.role ?? undefined,
        }}
      />
      <IntegrationsSection />
      {isAdmin && (
        <>
          {/* Server health */}
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

          {/* Security */}
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

          {/* Backups */}
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
        </>
      )}
    </SettingsShell>
  );
}
