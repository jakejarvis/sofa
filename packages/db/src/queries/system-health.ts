import { count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../client";
import { cronRuns, episodes, titles, user } from "../schema";

export function getTableCounts() {
  const [titleCount] = db.select({ count: count() }).from(titles).all();
  const [episodeCount] = db.select({ count: count() }).from(episodes).all();
  const [userCount] = db.select({ count: count() }).from(user).all();
  return {
    titleCount: titleCount.count,
    episodeCount: episodeCount.count,
    userCount: userCount.count,
  };
}

export function getLatestCronRun(jobName: string) {
  return db
    .select()
    .from(cronRuns)
    .where(eq(cronRuns.jobName, jobName))
    .orderBy(desc(cronRuns.startedAt))
    .limit(1)
    .get();
}

export function getLatestCronRuns(jobNames: string[]) {
  if (jobNames.length === 0) return new Map<string, typeof cronRuns.$inferSelect>();
  const rows = db
    .select({
      id: cronRuns.id,
      jobName: cronRuns.jobName,
      status: cronRuns.status,
      startedAt: cronRuns.startedAt,
      finishedAt: cronRuns.finishedAt,
      durationMs: cronRuns.durationMs,
      errorMessage: cronRuns.errorMessage,
      rn: sql<number>`row_number() over (partition by ${cronRuns.jobName} order by ${cronRuns.startedAt} desc)`.as(
        "rn",
      ),
    })
    .from(cronRuns)
    .where(inArray(cronRuns.jobName, jobNames))
    .all()
    .filter((r) => r.rn === 1);

  return new Map(rows.map((r) => [r.jobName, r]));
}
