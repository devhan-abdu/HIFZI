import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { dailyMurajaLogs, weeklyMurajaPlans } from "@/src/features/muraja/database/murajaSchema";
import { and, eq, sql } from "drizzle-orm";
import { useSyncStore } from "./syncStore";
import { isAuthError, isConstraintError } from "./utils";
import type { SyncErrorDetail } from "./types";

function logPushError(table: SyncErrorDetail["table"], rowId: number, error: unknown) {
  const err = error as { code?: string; message?: string };
  useSyncStore.getState().pushError({
    table,
    rowId,
    code: err.code,
    message: err.message ?? "Unknown push error",
  });
}

export async function pushMurajaPlans(userId: string): Promise<void> {
  const pending = await db.query.weeklyMurajaPlans.findMany({
    where: and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.syncStatus, 0)),
  });

  for (const plan of pending) {
    try {
      const { data, error } = await supabase
        .from("weekly_muraja_plan")
        .upsert(
          {
            user_id: plan.userId,
            week_start_date: plan.startDate,
            week_end_date: plan.endDate,
            planned_pages_per_day: plan.plannedPagesPerDay,
            planned_pages: plan.plannedPagesPerDay,
            start_page: plan.startPage,
            end_page: plan.endPage,
            is_active: plan.isActive,
            selected_days: plan.selectedDays,
            estimated_time_min: plan.estimatedTimeMin,
            place: plan.place,
            note: plan.note,
            preferred_time: plan.preferredTime,
            is_custom_time: plan.isCustomTime,
            evaluation_day: plan.evaluationDay,
            completed_pages: plan.completedPages ?? 0,
            missed_days_count: plan.missedDaysCount ?? 0,
            perfect_days_count: plan.perfectDaysCount ?? 0,
            local_id: plan.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,local_id" },
        )
        .select("id")
        .single();

      if (error) {
        if (isAuthError(error)) throw error;
        if (isConstraintError(error)) {
          logPushError("muraja_plans", plan.id, error);
          continue;
        }
        throw error;
      }

      await db
        .update(weeklyMurajaPlans)
        .set({
          syncStatus: 1,
          remoteId: data?.id != null ? String(data.id) : plan.remoteId,
        })
        .where(eq(weeklyMurajaPlans.id, plan.id));
    } catch (error) {
      if (isAuthError(error)) throw error;
      logPushError("muraja_plans", plan.id, error);
    }
  }
}

export async function pushMurajaLogs(userId: string): Promise<void> {
  const pending = await db.query.dailyMurajaLogs.findMany({
    where: eq(dailyMurajaLogs.syncStatus, 0),
  });

  for (const log of pending) {
    if (!log.planId) continue;

    try {
      const plan = await db.query.weeklyMurajaPlans.findFirst({
        where: eq(weeklyMurajaPlans.id, log.planId),
      });

      if (!plan || plan.userId !== userId) continue;

      const remotePlanId = plan.remoteId ? Number(plan.remoteId) : null;
      if (!remotePlanId) continue;

      const { data, error } = await supabase
        .from("daily_muraja_logs")
        .upsert(
          {
            user_id: userId,
            plan_id: remotePlanId,
            date: log.date,
            completed_pages: log.completedPages,
            actual_time_min: log.actualTimeMin,
            status: log.status,
            is_catchup: log.isCatchup,
            start_page: log.startPage,
            mistakes_count: log.mistakesCount,
            hesitation_count: log.hesitationCount,
            quality_score: log.qualityScore,
            local_id: log.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,plan_id,date" },
        )
        .select("id")
        .single();

      if (error) {
        if (isAuthError(error)) throw error;
        if (isConstraintError(error)) {
          logPushError("muraja_logs", log.id, error);
          continue;
        }
        throw error;
      }

      await db
        .update(dailyMurajaLogs)
        .set({
          syncStatus: 1,
          remoteId: data?.id != null ? String(data.id) : log.remoteId,
        })
        .where(eq(dailyMurajaLogs.id, log.id));
    } catch (error) {
      if (isAuthError(error)) throw error;
      logPushError("muraja_logs", log.id, error);
    }
  }
}
