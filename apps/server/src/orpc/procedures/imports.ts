import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import type { ParseResult } from "@sofa/core/imports";
import {
  countUnresolved,
  getActiveImportJobForUser,
  insertImportJob,
  parseLetterboxdExport,
  parseSimklPayload,
  parseTraktPayload,
  processImportJob,
  readImportJob,
  updateImportJobProgress,
} from "@sofa/core/imports";
import { createLogger } from "@sofa/logger";

import { os } from "../context";
import { authed } from "../middleware";

const log = createLogger("imports");

const MAX_SSE_PER_USER = 3;
const activeSSEConnections = new Map<string, number>();

export const parseFile = os.imports.parseFile.use(authed).handler(async ({ input }) => {
  const { source, file } = input;
  let result: ParseResult;

  switch (source) {
    case "letterboxd":
      result = await parseLetterboxdExport(file);
      break;
    case "trakt": {
      let json: unknown;
      try {
        json = await file.json();
      } catch {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid JSON file",
          data: { code: AppErrorCode.IMPORT_INVALID_FILE },
        });
      }
      result = parseTraktPayload(json as Parameters<typeof parseTraktPayload>[0]);
      break;
    }
    case "simkl": {
      let json: unknown;
      try {
        json = await file.json();
      } catch {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid JSON file",
          data: { code: AppErrorCode.IMPORT_INVALID_FILE },
        });
      }
      result = parseSimklPayload(json as Parameters<typeof parseSimklPayload>[0]);
      break;
    }
  }

  return {
    data: result.data,
    warnings: result.warnings,
    diagnostics: result.diagnostics,
    stats: {
      movies: result.data.movies.length,
      episodes: result.data.episodes.length,
      watchlist: result.data.watchlist.length,
      ratings: result.data.ratings.length,
    },
  };
});

export const parsePayload = os.imports.parsePayload.use(authed).handler(({ input }) => {
  const { data } = input;

  return {
    data,
    warnings: [],
    diagnostics: { unresolved: countUnresolved(data), unsupported: 0 },
    stats: {
      movies: data.movies.length,
      episodes: data.episodes.length,
      watchlist: data.watchlist.length,
      ratings: data.ratings.length,
    },
  };
});

export const createJob = os.imports.createJob.use(authed).handler(async ({ input, context }) => {
  const { data, options } = input;

  // Guard against oversized payloads
  const totalItems =
    data.movies.length + data.episodes.length + data.watchlist.length + data.ratings.length;
  if (totalItems > 100_000) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Import payload too large",
      data: { code: AppErrorCode.IMPORT_PAYLOAD_TOO_LARGE },
    });
  }

  // Prevent concurrent imports per user.
  // Auto-cancel stale *pending* jobs (server crashed before worker started).
  const PENDING_STALE_MS = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();
  const existing = getActiveImportJobForUser(context.user.id);
  if (existing) {
    const isPending = existing.status === "pending";
    const isStale = isPending && now - existing.createdAt.getTime() > PENDING_STALE_MS;
    if (isStale) {
      updateImportJobProgress(existing.id, {
        status: "cancelled",
        finishedAt: new Date(),
        currentMessage: "Import timed out (stale job auto-cancelled)",
      });
      log.warn(`Auto-cancelled stale import job ${existing.id}`);
    } else {
      throw new ORPCError("CONFLICT", {
        message: "An import is already in progress",
        data: { code: AppErrorCode.IMPORT_ALREADY_RUNNING },
      });
    }
  }

  const job = insertImportJob({
    userId: context.user.id,
    source: data.source,
    status: "pending",
    payload: JSON.stringify(data),
    importWatches: options.importWatches,
    importWatchlist: options.importWatchlist,
    importRatings: options.importRatings,
    createdAt: new Date(),
  });

  // Fire-and-forget processing
  processImportJob(job.id).catch((err) => {
    log.error(`Import job ${job.id} failed:`, err);
  });

  return readImportJob(job.id);
});

export const getJob = os.imports.getJob.use(authed).handler(({ input, context }) => {
  return readImportJob(input.id, context.user.id);
});

export const cancelJob = os.imports.cancelJob.use(authed).handler(({ input, context }) => {
  const job = readImportJob(input.id, context.user.id);
  if (job.status !== "pending" && job.status !== "running") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Can only cancel pending or running jobs",
      data: { code: AppErrorCode.IMPORT_CANNOT_CANCEL },
    });
  }
  updateImportJobProgress(input.id, { status: "cancelled" });
  return readImportJob(input.id);
});

export const jobEvents = os.imports.jobEvents.use(authed).handler(async function* ({
  input,
  context,
}) {
  readImportJob(input.id, context.user.id);

  const userId = context.user.id;
  const current = activeSSEConnections.get(userId) ?? 0;
  if (current >= MAX_SSE_PER_USER) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Too many concurrent event streams",
    });
  }
  activeSSEConnections.set(userId, current + 1);

  try {
    const JOB_POLL_INTERVAL = 500;
    const MAX_POLL_DURATION_MS = 30 * 60 * 1000; // 30 minutes
    const startedAt = Date.now();

    while (true) {
      const job = readImportJob(input.id);
      const isTerminal =
        job.status === "success" || job.status === "error" || job.status === "cancelled";

      yield {
        type: (isTerminal ? "complete" : "progress") as "complete" | "progress",
        job,
      };

      if (isTerminal) return;

      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        yield { type: "timeout" as const, job };
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL));
    }
  } finally {
    const count = activeSSEConnections.get(userId) ?? 1;
    if (count <= 1) {
      activeSSEConnections.delete(userId);
    } else {
      activeSSEConnections.set(userId, count - 1);
    }
  }
});
