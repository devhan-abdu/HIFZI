import { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/src/lib/supabase";
import { IMonthHistory } from "@/src/types";
import { IDailyMurajaLog, IWeeklyMurajaPLan } from "../types";
import { ensureMurajaTables } from "./localMurajaService";

const FULL_PLAN_SELECT = `
*,
weekly_plan_days (
 *,
 daily_muraja_logs (*)
)`;

const FULL_HISTORY_SELECT = `
  id,
  week_start_date,
  week_end_date,
  start_surah,
  end_surah,
  start_page,
  end_page,
  start_juz,
  end_juz,
  planned_pages,
  status,
  estimated_time_min,
  weekly_plan_days (
    id,
    date,
    day_of_week,
    planned_pages,
    planned_start_page,
    weekly_plan_id,
    planned_end_page,
    estimated_time_min,
    daily_muraja_logs (
      id,
      completed_pages,
      actual_time_min,
      weekly_plan_day_id,
      date,
      status,
      note,
      place
    )
  )
`;

type RemoteMurajaPlanRow = {
  id: number;
  remote_id: string | null;
};

function normalizeDate(date?: string) {
  return date || new Date().toISOString().slice(0, 10);
}

async function resolveRemoteWeeklyPlanDayIdFromLocalDb(
  db: SQLiteDatabase,
  localPlanId: number,
  date: string,
): Promise<number> {
  await ensureMurajaTables(db);

  const localPlan = await db.getFirstAsync<RemoteMurajaPlanRow>(
    `SELECT id, remote_id FROM weekly_muraja_plan WHERE id = ? LIMIT 1`,
    [localPlanId],
  );

  const remotePlanId = Number(localPlan?.remote_id ?? 0);
  if (!remotePlanId) {
    throw new Error(`[murajaService.upsertLog]: remote plan missing for local plan ${localPlanId}`);
  }

  const dayResponse = await supabase
    .from("weekly_plan_days")
    .select("id")
    .eq("weekly_plan_id", remotePlanId)
    .eq("date", date)
    .maybeSingle();

  if (dayResponse.error) {
    throw new Error(`[murajaService.upsertLog]: ${dayResponse.error.message}`);
  }

  const weeklyPlanDayId = Number(dayResponse.data?.id ?? 0);
  if (!weeklyPlanDayId) {
    throw new Error(`[murajaService.upsertLog]: missing weekly_plan_day_id for ${date}`);
  }

  return weeklyPlanDayId;
}

export const murajaServices = {
  async createCompletePlan(planData: Omit<IWeeklyMurajaPLan, "id">) {
    const { error: updateError } = await supabase
      .from("weekly_muraja_plan")
      .update({ is_active: 1 })
      .eq("user_id", planData.user_id)
      .eq("is_active", 0);

    if (updateError) throw new Error("Failed to Archive the plan");

    const { data, error: planError } = await supabase
      .from("weekly_muraja_plan")
      .insert(planData)
      .select()
      .single();

    if (planError) throw new Error(planError.message);

    return data.id;
  },

  async getDashboardState(userId: string): Promise<IMonthHistory | null> {
    const { data, error } = await supabase
      .from("weekly_muraja_plan")
      .select(FULL_PLAN_SELECT)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("[murajaService.getDashboardState]");
    return data;
  },

  async upsertLog(db: SQLiteDatabase, logData: IDailyMurajaLog, userId: string) {
    const targetDate = normalizeDate(logData.date);
    if (!logData.plan_id) {
      throw new Error("[murajaService.upsertLog]: missing plan_id");
    }

    const weeklyPlanDayId = await resolveRemoteWeeklyPlanDayIdFromLocalDb(
      db,
      logData.plan_id,
      targetDate,
    );

    const payload = {
      user_id: userId,
      weekly_plan_day_id: weeklyPlanDayId,
      date: targetDate,
      completed_pages: Math.max(0, Number(logData.completed_pages ?? 0)),
      actual_time_min: Math.max(0, Number(logData.actual_time_min ?? 0)),
      status: logData.status,
      mistakes_count: logData.mistakes_count,
      hesitation_count: logData.hesitation_count,
      quality_score: (() => {
        const mCount = logData.mistakes_count ?? 0;
        const hCount = logData.hesitation_count ?? 0;
        if (mCount >= 4) return 1;
        if (mCount >= 2) return 2;
        if (mCount >= 1 || hCount >= 3) return 3;
        if (hCount >= 1) return 4;
        return 5;
      })(),
    };

    const { data, error } = await supabase
      .from("daily_muraja_logs")
      .upsert(payload, { onConflict: "user_id,weekly_plan_day_id,date" })
      .select()
      .single();

    if (error) throw new Error(`[murajaService.upsertLog]: ${error.message}`);
    return data;
  },

  async syncPendingLogs(db: SQLiteDatabase, userId: string) {
    await ensureMurajaTables(db);

    const pendingLogs = await db.getAllAsync<
      IDailyMurajaLog & {
        id: number;
      }
    >(
      `
        SELECT id, remote_id, plan_id, date, start_page, completed_pages, actual_time_min, status, is_catchup, sync_status, mistakes_count, hesitation_count, quality_score
        FROM daily_muraja_logs
        WHERE sync_status = 0
          AND plan_id IN (SELECT id FROM weekly_muraja_plan WHERE user_id = ?)
          AND status IN ('completed', 'partial', 'missed')
        ORDER BY id ASC
      `,
      [userId],
    );

    for (const log of pendingLogs) {
      try {
        const targetDate = normalizeDate(log.date);
        const weeklyPlanDayId = await resolveRemoteWeeklyPlanDayIdFromLocalDb(
          db,
          log.plan_id,
          targetDate,
        );

        const response = await supabase
          .from("daily_muraja_logs")
          .upsert(
            {
              user_id: userId,
              weekly_plan_day_id: weeklyPlanDayId,
              date: targetDate,
              completed_pages: Math.max(0, Number(log.completed_pages ?? 0)),
              actual_time_min: Math.max(0, Number(log.actual_time_min ?? 0)),
              status: log.status,
              mistakes_count: log.mistakes_count,
              hesitation_count: log.hesitation_count,
              quality_score: log.quality_score,
            },
            { onConflict: "user_id,weekly_plan_day_id,date" },
          )
          .select("id")
          .single();

        if (response.error) {
          throw response.error;
        }

        await db.runAsync(
          `UPDATE daily_muraja_logs SET remote_id = ?, sync_status = 1 WHERE id = ?`,
          [response.data?.id ? String(response.data.id) : null, log.id],
        );
      } catch (error: any) {
        console.warn("Muraja sync queued for retry:", error?.message ?? error);
        break;
      }
    }
  },

  async deletePlan(planId: number) {
    const { error } = await supabase
      .from("weekly_muraja_plan")
      .delete()
      .eq("id", planId);

    if (error) throw new Error(`[murajaService.deletePlan]: ${error.message}`);
  },

  async getReviewStats(userId: string, planId?: number): Promise<IMonthHistory | null> {
    let query = supabase
      .from("weekly_muraja_plan")
      .select(FULL_HISTORY_SELECT)
      .eq("user_id", userId)
      .eq("status", "completed");

    if (planId) {
      query = query.eq("id", planId);
    } else {
      query = query.order("week_end_date", { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`[murajaService.getReviewStats]: ${error.message}`);
    return data;
  },

  async getMonthlyHistory(year: number, month: number, userId: string): Promise<IMonthHistory[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("weekly_muraja_plan")
      .select(FULL_HISTORY_SELECT)
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("week_end_date", startDate)
      .lte("week_start_date", endDate)
      .order("week_start_date", { ascending: false });

    if (error) throw new Error(`[murajaService.getMonthlyHistory]: ${error.message}`);
    return data;
  },
};
