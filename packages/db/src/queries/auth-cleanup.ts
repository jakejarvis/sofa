import { lt } from "drizzle-orm";

import { db } from "../client";
import { session, verification } from "../schema";

export function deleteExpiredSessions(): number {
  return db
    .delete(session)
    .where(lt(session.expiresAt, new Date()))
    .returning({ id: session.id })
    .all().length;
}

export function deleteExpiredVerifications(): number {
  return db
    .delete(verification)
    .where(lt(verification.expiresAt, new Date()))
    .returning({ id: verification.id })
    .all().length;
}
