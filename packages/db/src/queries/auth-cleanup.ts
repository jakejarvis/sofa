import { lt } from "drizzle-orm";

import { db } from "../client";
import { session, verification } from "../schema";

export function deleteExpiredSessions(): number {
  const now = new Date();
  const count = db
    .select({ id: session.id })
    .from(session)
    .where(lt(session.expiresAt, now))
    .all().length;
  if (count === 0) return 0;
  db.delete(session).where(lt(session.expiresAt, now)).run();
  return count;
}

export function deleteExpiredVerifications(): number {
  const now = new Date();
  const count = db
    .select({ id: verification.id })
    .from(verification)
    .where(lt(verification.expiresAt, now))
    .all().length;
  if (count === 0) return 0;
  db.delete(verification).where(lt(verification.expiresAt, now)).run();
  return count;
}
