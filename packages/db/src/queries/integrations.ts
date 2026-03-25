import { and, desc, eq } from "drizzle-orm";

import { db } from "../client";
import { integrationEvents, integrations } from "../schema";

export function getUserIntegrations(userId: string) {
  return db.select().from(integrations).where(eq(integrations.userId, userId)).all();
}

export function getRecentEventsForIntegration(integrationId: string, limit = 10) {
  return db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.integrationId, integrationId))
    .orderBy(desc(integrationEvents.receivedAt))
    .limit(limit)
    .all();
}

export function getRecentEventsForIntegrations(integrationIds: string[], limit = 10) {
  if (integrationIds.length === 0)
    return new Map<string, ReturnType<typeof getRecentEventsForIntegration>>();

  const result = new Map<string, ReturnType<typeof getRecentEventsForIntegration>>();
  for (const integrationId of integrationIds) {
    const events = getRecentEventsForIntegration(integrationId, limit);
    if (events.length > 0) result.set(integrationId, events);
  }
  return result;
}

export function getIntegrationByUserAndProvider(userId: string, provider: string) {
  return db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
    .get();
}

export function updateIntegrationEnabled(integrationId: string, enabled: boolean) {
  return db
    .update(integrations)
    .set({ enabled })
    .where(eq(integrations.id, integrationId))
    .returning()
    .get();
}

export function insertIntegration(values: typeof integrations.$inferInsert) {
  return db.insert(integrations).values(values).returning().get();
}

export function deleteIntegrationByUserAndProvider(userId: string, provider: string): void {
  db.delete(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
    .run();
}

export function regenerateIntegrationToken(userId: string, provider: string, newToken: string) {
  return db
    .update(integrations)
    .set({ token: newToken })
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
    .returning()
    .get();
}

export function getIntegrationByToken(token: string) {
  return db.select().from(integrations).where(eq(integrations.token, token)).get();
}
