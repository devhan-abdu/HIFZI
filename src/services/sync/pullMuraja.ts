import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { dailyMurajaLogs, weeklyMurajaPlans } from "@/src/features/muraja/database/murajaSchema";
import { activityPlans } from "@/src/features/habits/database/habitSchema";
import { eq, and } from "drizzle-orm";
import type { RemoteSyncRow } from "./types";
import { remoteUpdatedAt } from "./utils";

export async function pullMurajaPlans(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("weekly_muraja_plan").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const localId = Number(row.local_id);
    if (!localId) continue;

    const local = await db.query.weeklyMurajaPlans.findFirst({
      where: eq(weeklyMurajaPlans.id, localId),
    });

    if (local && local.syncStatus === 0) continue;

    const remoteAt = remoteUpdatedAt(row);
    if (
      local &&
      local.syncStatus === 1 &&
      !row.deleted_at &&
      local.remoteId === String(row.id ?? "")
    ) {
      continue;
    }

    const values = {
      userId,
      weekStartDate: (row.week_start_date as string | null) ?? null,
      weekEndDate: (row.week_end_date as string | null) ?? null,
      plannedPagesPerDay: (row.planned_pages_per_day as number | null) ?? null,
      startPage: (row.start_page as number | null) ?? null,
      endPage: (row.end_page as number | null) ?? null,
      isActive: row.deleted_at ? false : Boolean(row.is_active ?? true),
      selectedDays: (row.selected_days as string | null) ?? null,
      estimatedTimeMin: (row.estimated_time_min as number | null) ?? null,
      place: (row.place as string | null) ?? null,
      note: (row.note as string | null) ?? null,
      preferredTime: (row.preferred_time as string | null) ?? null,
      isCustomTime: Boolean(row.is_custom_time),
      evaluationDay: Number(row.evaluation_day ?? 6),
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      syncStatus: 1,
    };

    if (local) {
      await db.update(weeklyMurajaPlans).set(values).where(eq(weeklyMurajaPlans.id, localId));
    } else {
      await db.insert(weeklyMurajaPlans).values({ ...values, id: localId });
    }

    await db
      .update(activityPlans)
      .set({
        isSynced: 1,
        updatedAt: remoteAt,
        status: values.isActive ? "active" : "paused",
      })
      .where(
        and(
          eq(activityPlans.userId, userId),
          eq(activityPlans.activityType, "MURAJA"),
          eq(activityPlans.localRefId, localId),
        ),
      );

    changed = true;
  }

  return changed;
}

export async function pullMurajaLogs(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("daily_muraja_logs").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const localId = Number(row.local_id);
    if (!localId) continue;

    let local = await db.query.dailyMurajaLogs.findFirst({
      where: eq(dailyMurajaLogs.id, localId),
    });

    const localPlan = await db.query.weeklyMurajaPlans.findFirst({
      where: eq(weeklyMurajaPlans.remoteId, String(row.plan_id ?? "")),
    });
    const planId: number | undefined = localPlan?.id ?? local?.planId ?? undefined;
    if (!planId) continue;

    if (!local) {
      const localByDate = await db.query.dailyMurajaLogs.findFirst({
        where: and(
          eq(dailyMurajaLogs.planId, planId),
          eq(dailyMurajaLogs.date, String(row.date))
        ),
      });
      if (localByDate) {
        local = localByDate;
      }
    }

    if (local && local.syncStatus === 0) continue;

    const values = {
      planId,
      date: (row.date as string | null) ?? null,
      completedPages: (row.completed_pages as number | null) ?? 0,
      actualTimeMin: (row.actual_time_min as number | null) ?? 0,
      status: (row.status as string | null) ?? null,
      isCatchup: Boolean(row.is_catchup),
      startPage: (row.start_page as number | null) ?? null,
      mistakesCount: Number(row.mistakes_count ?? 0),
      hesitationCount: Number(row.hesitation_count ?? 0),
      qualityScore: (row.quality_score as number | null) ?? null,
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      syncStatus: 1,
    };

    if (local) {
      await db.update(dailyMurajaLogs).set(values).where(eq(dailyMurajaLogs.id, localId));
    } else {
      await db.insert(dailyMurajaLogs).values({ ...values, id: localId });
    }

    changed = true;
  }

  return changed;
}
