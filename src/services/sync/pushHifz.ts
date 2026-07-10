import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { hifzLogs, hifzPlans } from "@/src/features/hifz/database/hifzSchema";
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

export async function pushHifzPlans(userId: string): Promise<void> {
  const pending = await db.query.hifzPlans.findMany({
    where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.syncStatus, 0)),
  });

  for (const plan of pending) {
    try {
      const payload = {
        user_id: plan.userId,
        start_surah: plan.startSurah,
        start_page: plan.startPage,
        total_pages: plan.totalPages,
        pages_per_day: plan.pagesPerDay,
        selected_days: JSON.parse(plan.selectedDays ?? "[]"),
        days_per_week: plan.daysPerWeek,
        start_date: plan.startDate,
        estimated_end_date: plan.estimatedEndDate,
        direction: plan.direction,
        status: plan.status,
        preferred_time: plan.preferredTime,
        is_custom_time: plan.isCustomTime,
        is_reinforcement_enabled: plan.isReinforcementEnabled,
        evaluation_day: plan.evaluationDay,
        completed_pages: plan.completedPages ?? 0,
        missed_days_count: plan.missedDaysCount ?? 0,
        perfect_days_count: plan.perfectDaysCount ?? 0,
        deleted_at: plan.status === "deleted" ? new Date().toISOString() : null,
        local_id: plan.id,
        updated_at: plan.updatedAt,
      };

      const { data, error } = await supabase
        .from("hifz_plan")
        .upsert(payload, { onConflict: "user_id,local_id" })
        .select("id")
        .single();

      if (error) {
        if (isAuthError(error)) throw error;
        if (isConstraintError(error)) {
          logPushError("hifz_plans", plan.id, error);
          continue;
        }
        throw error;
      }

      await db
        .update(hifzPlans)
        .set({
          syncStatus: 1,
          remoteId: data?.id != null ? String(data.id) : plan.remoteId,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(hifzPlans.id, plan.id));
    } catch (error) {
      if (isAuthError(error)) throw error;
      logPushError("hifz_plans", plan.id, error);
    }
  }
}

export async function pushHifzLogs(userId: string): Promise<void> {
  const pending = await db.query.hifzLogs.findMany({
    where: and(eq(hifzLogs.userId, userId), eq(hifzLogs.syncStatus, 0)),
  });

  for (const log of pending) {
    try {
      const plan = await db.query.hifzPlans.findFirst({
        where: eq(hifzPlans.id, log.hifzPlanId),
      });

      const remotePlanId = Number(plan?.remoteId ?? log.hifzPlanId);
      if (!plan?.remoteId && plan?.syncStatus === 0) {
        continue;
      }

      const { data, error } = await supabase
        .from("hifz_daily_logs")
        .upsert(
          {
            user_id: log.userId,
            hifz_plan_id: remotePlanId,
            actual_start_page: log.actualStartPage,
            actual_end_page: log.actualEndPage,
            actual_pages_completed: log.actualPagesCompleted,
            date: log.date,
            log_day: log.logDay,
            status: log.status,
            notes: log.notes,
            mistakes_count: log.mistakesCount,
            hesitation_count: log.hesitationCount,
            quality_score: log.qualityScore,
            deleted_at: log.status === "missed" ? null : null,
            local_id: log.id,
            updated_at: log.updatedAt,
          },
          { onConflict: "user_id,hifz_plan_id,date" },
        )
        .select("id")
        .single();

      if (error) {
        if (isAuthError(error)) throw error;
        if (isConstraintError(error)) {
          logPushError("hifz_logs", log.id, error);
          continue;
        }
        throw error;
      }

      await db
        .update(hifzLogs)
        .set({
          syncStatus: 1,
          remoteId: data?.id != null ? String(data.id) : log.remoteId,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(hifzLogs.id, log.id));
    } catch (error) {
      if (isAuthError(error)) throw error;
      logPushError("hifz_logs", log.id, error);
    }
  }
}
