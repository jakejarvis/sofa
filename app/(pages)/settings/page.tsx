import {
  IconDatabaseExport,
  IconServerCog,
  IconShieldLock,
} from "@tabler/icons-react";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { webhookConnections, webhookEventLog } from "@/lib/db/schema";
import { listBackups } from "@/lib/services/backup";
import { getSetting } from "@/lib/services/settings";
import { APP_VERSION, GIT_COMMIT } from "@/lib/version";
import { AccountSection } from "./_components/account-section";
import { BackupRestoreSection } from "./_components/backup-restore-section";
import { BackupScheduleSection } from "./_components/backup-schedule-section";
import { BackupSection } from "./_components/backup-section";
import { IntegrationsSection } from "./_components/integrations-section";
import { ServerSection } from "./_components/server-section";
import { SettingsShell } from "./_components/settings-shell";
import { SystemHealthCards } from "./_components/system-health-section";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";

  const connections = db
    .select()
    .from(webhookConnections)
    .where(eq(webhookConnections.userId, session.user.id))
    .all()
    .map((conn) => {
      const events = db
        .select()
        .from(webhookEventLog)
        .where(eq(webhookEventLog.connectionId, conn.id))
        .orderBy(desc(webhookEventLog.receivedAt))
        .limit(10)
        .all();

      return {
        id: conn.id,
        provider: conn.provider,
        token: conn.token,
        mediaServerUsername: conn.mediaServerUsername,
        enabled: conn.enabled,
        lastEventAt: conn.lastEventAt?.toISOString() ?? null,
        recentEvents: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          mediaType: e.mediaType,
          mediaTitle: e.mediaTitle,
          status: e.status,
          receivedAt: e.receivedAt.toISOString(),
        })),
      };
    });

  const registrationOpen = isAdmin
    ? getSetting("registrationOpen") === "true"
    : false;

  const backups = isAdmin ? await listBackups() : [];
  const scheduledBackupsEnabled = isAdmin
    ? getSetting("scheduledBackups") === "true"
    : false;
  const maxBackupRetention = isAdmin
    ? Number.parseInt(getSetting("maxBackupRetention") ?? "7", 10)
    : 7;
  const backupFrequency = isAdmin
    ? (getSetting("backupScheduleFrequency") ?? "1d")
    : "1d";
  const backupTime = isAdmin
    ? (getSetting("backupScheduleTime") ?? "02:00")
    : "02:00";
  const backupDow = isAdmin
    ? Number.parseInt(getSetting("backupScheduleDow") ?? "0", 10)
    : 0;

  const repoUrl = "https://github.com/jakejarvis/sofa";

  return (
    <SettingsShell
      footer={
        <footer className="border-t border-border/50 pt-6 pb-2 text-center text-xs text-muted-foreground">
          <p>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary/80 hover:text-primary transition-colors"
            >
              Sofa
            </a>{" "}
            v{APP_VERSION}
            {GIT_COMMIT && (
              <>
                {" "}
                (
                <a
                  href={`${repoUrl}/commit/${GIT_COMMIT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-primary transition-colors"
                >
                  {GIT_COMMIT}
                </a>
                )
              </>
            )}
          </p>
        </footer>
      }
    >
      <AccountSection
        user={{
          name: session.user.name,
          email: session.user.email,
          createdAt: session.user.createdAt.toISOString(),
          role: session.user.role ?? undefined,
        }}
      />
      <IntegrationsSection initialConnections={connections} />
      {isAdmin && (
        <>
          {/* Server health */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <IconServerCog className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Server
              </h2>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Admin only
              </span>
            </div>
            <SystemHealthCards />
          </div>

          {/* Security */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <IconShieldLock className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Security
              </h2>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Admin only
              </span>
            </div>
            <div className="space-y-3">
              <Card className="border-l-2 border-l-primary/30">
                <ServerSection initialRegistrationOpen={registrationOpen} />
              </Card>
            </div>
          </div>

          {/* Backups */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <IconDatabaseExport className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Backups
              </h2>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Admin only
              </span>
            </div>
            <div className="space-y-3">
              <Card className="border-l-2 border-l-primary/30">
                <BackupSection initialBackups={backups} />
              </Card>
              <Card className="border-l-2 border-l-primary/30">
                <BackupScheduleSection
                  initialScheduledEnabled={scheduledBackupsEnabled}
                  initialMaxRetention={maxBackupRetention}
                  initialFrequency={
                    backupFrequency as "6h" | "12h" | "1d" | "7d"
                  }
                  initialTime={backupTime}
                  initialDow={backupDow}
                />
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
