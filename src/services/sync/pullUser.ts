import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { userStats, pagePerformance, userBadges } from "@/src/features/user/database/userSchema";
import { and, eq } from "drizzle-orm";
import type { RemoteSyncRow } from "./types";
import { compareUpdatedAt, remoteUpdatedAt } from "./utils";

export async function pullUserStats(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("user_stats").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const local = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    const values = {
      userId,
      murajaLastPage: Number(row.muraja_last_page ?? 0),
      murajaCurrentStreak: Number(row.muraja_current_streak ?? 0),
      hifzLastPage: Number(row.hifz_last_page ?? 0),
      hifzCurrentStreak: Number(row.hifz_current_streak ?? 0),
      globalLongestStreak: Number(row.global_longest_streak ?? 0),
      totalXp: Number(row.total_xp ?? 0),
      level: Number(row.level ?? 0),
      lastNotifiedAt: (row.last_notified_at as string | null) ?? null,
      lastActivityDate: (row.last_activity_date as string | null) ?? null,
      hasRecoveryShield: Boolean(row.has_recovery_shield),
      lastTestDate: (row.last_test_date as string | null) ?? null,
      consecutivePerfects: Number(row.consecutive_perfects ?? 0),
    };

    if (local) {
      await db.update(userStats).set(values).where(eq(userStats.userId, userId));
    } else {
      await db.insert(userStats).values(values);
    }

    changed = true;
  }

  return changed;
}

export async function pullPagePerformance(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("page_performance").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const pageNumber = Number(row.page_number);
    if (!pageNumber) continue;

    const local = await db.query.pagePerformance.findFirst({
      where: and(
        eq(pagePerformance.userId, userId),
        eq(pagePerformance.pageNumber, pageNumber),
      ),
    });

    const remoteAt = remoteUpdatedAt(row);
    if (local && compareUpdatedAt(remoteAt, local.updatedAt) <= 0) continue;

    const values = {
      userId,
      pageNumber,
      strength: Number(row.strength ?? 0),
      lastReviewedAt: (row.last_reviewed_at as string | null) ?? null,
      nextReviewAt: (row.next_review_at as string | null) ?? null,
      stability: Number(row.stability ?? 1),
      difficulty: Number(row.difficulty ?? 1),
      consecutivePerfects: Number(row.consecutive_perfects ?? 0),
      lastSessionQuality: (row.last_session_quality as "perfect" | "medium" | "low" | null) ?? null,
      lastMistakesCount: Number(row.last_mistakes_count ?? 0),
      lastHesitationsCount: Number(row.last_hesitations_count ?? 0),
      updatedAt: remoteAt,
    };

    if (local) {
      await db
        .update(pagePerformance)
        .set(values)
        .where(
          and(
            eq(pagePerformance.userId, userId),
            eq(pagePerformance.pageNumber, pageNumber),
          ),
        );
    } else {
      await db.insert(pagePerformance).values(values);
    }

    changed = true;
  }

  return changed;
}

export async function pullUserBadges(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("user_badges").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("achieved_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const badgeId = String(row.badge_id ?? "");
    if (!badgeId) continue;

    const local = await db.query.userBadges.findFirst({
      where: eq(userBadges.badgeId, badgeId),
    });

    if (local) continue;

    await db.insert(userBadges).values({
      badgeId,
      userId,
      badgeType: String(row.badge_type ?? "UNKNOWN"),
      achievedAt: String(row.achieved_at ?? new Date().toISOString()),
      metadata: (row.metadata as string | null) ?? null,
    });
    changed = true;
  }

  return changed;
}
