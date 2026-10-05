export type SessionEndReason = "sign-out" | "server-change";

let pendingReason: SessionEndReason | null = null;

/** Call right before a deliberate sign-out so the session loss isn't reported as an expiry. */
export function markSessionEnding(reason: SessionEndReason): void {
  pendingReason = reason;
}

/** Read and clear the reason. null = the session ended without the user asking (expired/revoked). */
export function consumeSessionEndReason(): SessionEndReason | null {
  const reason = pendingReason;
  pendingReason = null;
  return reason;
}
