import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { userStats, pagePerformance, userBadges } from "@/src/features/user/database/userSchema";
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

export async function pushUserStats(userId: string): Promise<void> {
  try {
    const stats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    if (!stats) return;

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
  try {
    const performances = await db.query.pagePerformance.findMany({
      where: eq(pagePerformance.userId, userId),
    });

    if (!performances.length) return;

    const payload = performances.map((perf) => ({
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

export async function pushUserBadges(userId: string): Promise<void> {
  try {
    const badges = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
    });

    if (!badges.length) return;

    const payload = badges.map((badge) => ({
      badge_id: badge.badgeId,
      user_id: badge.userId,
      badge_type: badge.badgeType,
      achieved_at: badge.achievedAt,
      metadata: badge.metadata,
    }));

    const CHUNK_SIZE = 100;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("user_badges")
        .upsert(chunk, { onConflict: "badge_id" });

      if (error) {
        if (isAuthError(error)) throw error;
        logPushError("user_badges", `chunk_${i}`, error);
      }
    }
  } catch (error) {
    if (isAuthError(error)) throw error;
    logPushError("user_badges", "all", error);
  }
}
