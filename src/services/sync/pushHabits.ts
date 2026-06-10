import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { eq } from "drizzle-orm";
import { useSyncStore } from "./syncStore";
import { isAuthError, isConstraintError } from "./utils";
import type { SyncErrorDetail } from "./types";

function logPushError(table: SyncErrorDetail["table"], rowId: number | string, error: unknown) {
  const err = error as { code?: string; message?: string };
  useSyncStore.getState().pushError({
    table,
    rowId,
    code: err.code,
    message: err.message ?? "Unknown push error",
  });
}

export async function pushPageActivityLogs(userId: string): Promise<void> {
  // `pageActivityLogs` does not currently have a `syncStatus`. 
  // Ideally, it should, but for now we fetch all of them.
  // In a real production scenario, we should add syncStatus to avoid pushing everything.
  try {
    const logs = await db.query.pageActivityLogs.findMany({
      where: eq(pageActivityLogs.userId, userId),
    });

    if (!logs.length) return;

    const payload = logs.map(log => ({
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

    const CHUNK_SIZE = 200;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("page_activity_logs")
        .upsert(chunk, { onConflict: "user_id,source,local_log_id" });

      if (error) {
        if (isAuthError(error)) throw error;
        logPushError("page_activity_logs", `chunk_${i}`, error);
      }
    }
  } catch (error) {
    if (isAuthError(error)) throw error;
    logPushError("page_activity_logs", "all", error);
  }
}
