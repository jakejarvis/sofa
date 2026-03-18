import { count, desc, eq } from "drizzle-orm";

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
