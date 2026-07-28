import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { eq } from "drizzle-orm";
import { useSyncStore } from "./syncStore";
import { isAuthError } from "./utils";
import type { SyncErrorDetail } from "./types";

type PageActivityPayload = {
  user_id: string;
  page_id: number;
  source: string;
  local_log_id: number;
  log_date: string;
  session_quality: string | null | undefined;
  mistakes_count: number | null;
  hesitations_count: number | null;
  created_at: string;
};

const VALID_SESSION_QUALITIES = new Set(["perfect", "medium", "low"]);

/** Guard against overlapping full-table pushes (login + foreground + syncPending). */
let pageActivityPushInFlight: Promise<void> | null = null;

function logPushError(table: SyncErrorDetail["table"], rowId: number | string, error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string };
  useSyncStore.getState().pushError({
    table,
    rowId,
    code: err.code,
    message: err.message ?? "Unknown push error",
  });
}

function diagnoseChunk(chunk: PageActivityPayload[], chunkIndex: number) {
  const qualityCounts = {
    perfect: 0,
    medium: 0,
    low: 0,
    empty: 0,
    nullish: 0,
    invalid: 0,
  };
  const badQualitySamples: Array<{
    page_id: number;
    local_log_id: number;
    session_quality: unknown;
  }> = [];

  const conflictKeyCounts = new Map<string, number>();
  const conflictKeyPageIds = new Map<string, number[]>();

  for (const row of chunk) {
    const q = row.session_quality;
    if (q == null) {
      qualityCounts.nullish++;
      if (badQualitySamples.length < 5) {
        badQualitySamples.push({
          page_id: row.page_id,
          local_log_id: row.local_log_id,
          session_quality: q,
        });
      }
    } else if (q === "") {
      qualityCounts.empty++;
      if (badQualitySamples.length < 5) {
        badQualitySamples.push({
          page_id: row.page_id,
          local_log_id: row.local_log_id,
          session_quality: q,
        });
      }
    } else if (VALID_SESSION_QUALITIES.has(q)) {
      qualityCounts[q as "perfect" | "medium" | "low"]++;
    } else {
      qualityCounts.invalid++;
      if (badQualitySamples.length < 5) {
        badQualitySamples.push({
          page_id: row.page_id,
          local_log_id: row.local_log_id,
          session_quality: q,
        });
      }
    }

    // Unique target includes page_id (one row per page in a session log)
    const conflictKey = `${row.user_id}|${row.source}|${row.local_log_id}|${row.page_id}`;
    conflictKeyCounts.set(conflictKey, (conflictKeyCounts.get(conflictKey) ?? 0) + 1);
    const pages = conflictKeyPageIds.get(conflictKey) ?? [];
    pages.push(row.page_id);
    conflictKeyPageIds.set(conflictKey, pages);
  }

  const duplicateConflictKeys = [...conflictKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({
      key,
      count,
      page_ids: conflictKeyPageIds.get(key)?.slice(0, 10) ?? [],
    }));

  return {
    chunkIndex,
    rowCount: chunk.length,
    qualityCounts,
    badQualitySamples,
    duplicateConflictKeyCount: duplicateConflictKeys.length,
    duplicateConflictKeys: duplicateConflictKeys.slice(0, 10),
  };
}

function logPageActivityUpsertFailure(
  chunk: PageActivityPayload[],
  chunkIndex: number,
  error: unknown,
) {
  const err = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
  };
  const diagnosis = diagnoseChunk(chunk, chunkIndex);

  console.error("[sync] page_activity_logs upsert failed", {
    postgrest: {
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
      status: err.status,
    },
    diagnosis,
    sampleRows: chunk.slice(0, 3).map((r) => ({
      user_id: r.user_id,
      page_id: r.page_id,
      source: r.source,
      local_log_id: r.local_log_id,
      log_date: r.log_date,
      session_quality: r.session_quality,
      session_quality_typeof: typeof r.session_quality,
    })),
  });

  logPushError("page_activity_logs", `chunk_${chunkIndex}`, error);
}

export async function pushPageActivityLogs(userId: string): Promise<void> {
  // `pageActivityLogs` does not currently have a `syncStatus`.
  // Ideally, it should, but for now we fetch all of them.
  if (pageActivityPushInFlight) {
    console.warn("[sync] page_activity_logs push skipped — already in flight");
    return pageActivityPushInFlight;
  }

  pageActivityPushInFlight = (async () => {
    try {
      const logs = await db.query.pageActivityLogs.findMany({
        where: eq(pageActivityLogs.userId, userId),
      });

      if (!logs.length) return;

      const payload: PageActivityPayload[] = logs.map((log) => ({
        user_id: log.userId,
        page_id: log.pageId,
        source: log.source,
        local_log_id: log.localLogId,
        log_date: log.logDate,
        session_quality: log.sessionQuality,
        mistakes_count: log.mistakesCount,
        hesitations_count: log.hesitationsCount,
        created_at: log.createdAt,
      }));

      const preflight = diagnoseChunk(payload, -1);
      if (
        preflight.qualityCounts.nullish > 0 ||
        preflight.qualityCounts.empty > 0 ||
        preflight.qualityCounts.invalid > 0 ||
        preflight.duplicateConflictKeyCount > 0
      ) {
        console.warn("[sync] page_activity_logs preflight warnings", preflight);
      }

      const CHUNK_SIZE = 200;
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const startedAt = Date.now();
        const { error } = await supabase
          .from("page_activity_logs")
          .upsert(chunk, { onConflict: "user_id,source,local_log_id,page_id" });

        if (error) {
          if (isAuthError(error)) throw error;
          logPageActivityUpsertFailure(chunk, i, error);
        } else if (process.env.NODE_ENV !== "production") {
          console.log("[sync] page_activity_logs chunk ok", {
            chunkIndex: i,
            rowCount: chunk.length,
            ms: Date.now() - startedAt,
          });
        }
      }
    } catch (error) {
      if (isAuthError(error)) throw error;
      console.error("[sync] page_activity_logs push threw", error);
      logPushError("page_activity_logs", "all", error);
    } finally {
      pageActivityPushInFlight = null;
    }
  })();

  return pageActivityPushInFlight;
}
