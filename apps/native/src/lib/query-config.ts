/** How long persisted query data is kept (and restored) — 24 h. */
export const QUERY_PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;
/** gcTime must be ≥ the persister's maxAge, or GC'd queries vanish from the persisted cache. */
export const QUERY_GC_TIME = QUERY_PERSIST_MAX_AGE;
