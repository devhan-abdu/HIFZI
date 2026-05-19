import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { hifzLogs, hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { activityPlans } from "@/src/features/habits/database/habitSchema";
import { eq, and, sql } from "drizzle-orm";
import type { RemoteSyncRow } from "./types";
import { compareUpdatedAt, remoteUpdatedAt } from "./utils";

function parseSelectedDays(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  return "[]";
}

export async function pullHifzPlans(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("hifz_plan").select("*").eq("user_id", userId);
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

    const local = await db.query.hifzPlans.findFirst({
      where: eq(hifzPlans.id, localId),
    });

    if (local && local.syncStatus === 0) continue;

    const remoteAt = remoteUpdatedAt(row);
    if (local && compareUpdatedAt(remoteAt, local.updatedAt) <= 0) continue;

    const isDeleted = !!row.deleted_at;
    const status = isDeleted ? "paused" : String(row.status ?? "active");

    const values = {
      userId,
      startSurah: Number(row.start_surah ?? 1),
      startPage: Number(row.start_page ?? 1),
      totalPages: Number(row.total_pages ?? 1),
      pagesPerDay: Number(row.pages_per_day ?? 1),
      selectedDays: parseSelectedDays(row.selected_days),
      daysPerWeek: Number(row.days_per_week ?? 5),
      startDate: String(row.start_date ?? new Date().toISOString().slice(0, 10)),
      estimatedEndDate: String(
        row.estimated_end_date ?? new Date().toISOString().slice(0, 10),
      ),
      direction: String(row.direction ?? "forward"),
      status,
      preferredTime: (row.preferred_time as string | null) ?? null,
      isCustomTime: Boolean(row.is_custom_time),
      isReinforcementEnabled: Boolean(row.is_reinforcement_enabled ?? true),
      evaluationDay: Number(row.evaluation_day ?? 7),
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      syncStatus: 1,
      updatedAt: remoteAt,
    };

    if (local) {
      await db.update(hifzPlans).set(values).where(eq(hifzPlans.id, localId));
    } else {
      await db.insert(hifzPlans).values({ ...values, id: localId });
    }

    await db
      .update(activityPlans)
      .set({ status, updatedAt: remoteAt, isSynced: 1 })
      .where(
        and(
          eq(activityPlans.userId, userId),
          eq(activityPlans.activityType, "HIFZ"),
          eq(activityPlans.localRefId, localId),
        ),
      );

    changed = true;
  }

  return changed;
}

export async function pullHifzLogs(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("hifz_daily_logs").select("*").eq("user_id", userId);
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

    const local = await db.query.hifzLogs.findFirst({
      where: eq(hifzLogs.id, localId),
    });

    if (local && local.syncStatus === 0) continue;

    const remoteAt = remoteUpdatedAt(row);
    if (local && compareUpdatedAt(remoteAt, local.updatedAt) <= 0) continue;

    const localPlan = await db.query.hifzPlans.findFirst({
      where: eq(hifzPlans.remoteId, String(row.hifz_plan_id ?? "")),
    });
    const hifzPlanId = localPlan?.id ?? local?.hifzPlanId ?? 0;
    if (!hifzPlanId) continue;

    const values = {
      userId,
      hifzPlanId,
      actualStartPage: Number(row.actual_start_page ?? 1),
      actualEndPage: Number(row.actual_end_page ?? 1),
      actualPagesCompleted: Number(row.actual_pages_completed ?? 0),
      date: String(row.date),
      logDay: Number(row.log_day ?? 0),
      status: String(row.status ?? "completed"),
      notes: (row.notes as string | null) ?? null,
      mistakesCount: Number(row.mistakes_count ?? 0),
      hesitationCount: Number(row.hesitation_count ?? 0),
      qualityScore: (row.quality_score as number | null) ?? null,
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      syncStatus: 1,
      updatedAt: remoteAt,
    };

    if (local) {
      await db.update(hifzLogs).set(values).where(eq(hifzLogs.id, localId));
    } else {
      await db.insert(hifzLogs).values({ ...values, id: localId });
    }

    changed = true;
  }

  return changed;
}
