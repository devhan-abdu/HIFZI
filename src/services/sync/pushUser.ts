import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { userStats, pagePerformance } from "@/src/features/user/database/userSchema";
import { eq, sql } from "drizzle-orm";
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

export async function pushUserStats(userId: string): Promise<void> {
  try {
    const stats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    if (!stats) return;

    // We don't have a sync_status for user_stats locally, so we push it every time
    // this function is called, relying on the fact that it is called when a mutation happens.
    
    const payload = {
      user_id: stats.userId,
      muraja_last_page: stats.murajaLastPage,
      muraja_current_streak: stats.murajaCurrentStreak,
      hifz_last_page: stats.hifzLastPage,
      hifz_current_streak: stats.hifzCurrentStreak,
      global_longest_streak: stats.globalLongestStreak,
      total_xp: stats.totalXp,
      level: stats.level,
      last_notified_at: stats.lastNotifiedAt,
      last_activity_date: stats.lastActivityDate,
      has_recovery_shield: stats.hasRecoveryShield,
      last_test_date: stats.lastTestDate,
      consecutive_perfects: stats.consecutivePerfects,
      // Let Supabase handle updated_at automatically or pass it if you added it locally.
    };

    const { error } = await supabase
      .from("user_stats")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      if (isAuthError(error)) throw error;
      if (isConstraintError(error)) {
        logPushError("user_stats", userId, error);
        return;
      }
      throw error;
    }
  } catch (error) {
    if (isAuthError(error)) throw error;
    logPushError("user_stats", userId, error);
  }
}

export async function pushPagePerformance(userId: string): Promise<void> {
  // Since we do not have syncStatus on pagePerformance locally,
  // we could push all rows (inefficient) or rely on a timestamp.
  // For now, we will fetch all rows for the user. In a real app,
  // adding `syncStatus` or `isSynced` to the local schema is highly recommended.
  try {
    const performances = await db.query.pagePerformance.findMany({
      where: eq(pagePerformance.userId, userId),
    });

    if (!performances.length) return;

    // Batch upsert
    const payload = performances.map(perf => ({
      user_id: perf.userId,
      page_number: perf.pageNumber,
      strength: perf.strength,
      last_reviewed_at: perf.lastReviewedAt,
      next_review_at: perf.nextReviewAt,
      stability: perf.stability,
      difficulty: perf.difficulty,
      consecutive_perfects: perf.consecutivePerfects,
      last_session_quality: perf.lastSessionQuality,
      last_mistakes_count: perf.lastMistakesCount,
      last_hesitations_count: perf.lastHesitationsCount,
      updated_at: perf.updatedAt,
    }));

    // Chunk the payload to avoid massive requests
    const CHUNK_SIZE = 500;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("page_performance")
        .upsert(chunk, { onConflict: "user_id,page_number" });

      if (error) {
        if (isAuthError(error)) throw error;
        logPushError("page_performance", `chunk_${i}`, error);
      }
    }
  } catch (error) {
    if (isAuthError(error)) throw error;
    logPushError("page_performance", "all", error);
  }
}
