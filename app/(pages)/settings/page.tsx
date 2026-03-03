import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { webhookConnections, webhookEventLog } from "@/lib/db/schema";
import { getSetting } from "@/lib/services/settings";
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

  return (
    <SettingsShell>
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
