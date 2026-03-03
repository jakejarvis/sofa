import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { webhookConnections, webhookEventLog } from "@/lib/db/schema";
import { getSetting } from "@/lib/services/settings";
import { APP_VERSION, GIT_COMMIT } from "@/lib/version";
import { AccountSection } from "./_components/account-section";
import { IntegrationsSection } from "./_components/integrations-section";
import { ServerSection } from "./_components/server-section";
import { SettingsShell } from "./_components/settings-shell";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";

  const [connections, registrationOpen] = await Promise.all([
    (async () => {
      const rows = await db
        .select()
        .from(webhookConnections)
        .where(eq(webhookConnections.userId, session.user.id))
        .all();

      return Promise.all(
        rows.map(async (conn) => {
          const events = await db
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
        }),
      );
    })(),
    isAdmin
      ? getSetting("registrationOpen").then((v) => v === "true")
      : Promise.resolve(false),
  ]);

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
      {isAdmin && <ServerSection initialRegistrationOpen={registrationOpen} />}
    </SettingsShell>
  );
}
