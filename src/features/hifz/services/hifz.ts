import { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/src/lib/supabase";
import { IHifzLog, IHifzPlan } from "../types";
import {
  insertHabitProgressLog,
  upsertActivityPlan,
} from "@/src/features/habits/services/habitProgressService";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";

type ICreate = {
  db: SQLiteDatabase;
  planData: Omit<IHifzPlan, "hifz_daily_logs">;
};
type UpdatePlanPayload = {
  db: SQLiteDatabase;
  userId: string;
  newPlanData: Omit<IHifzPlan, "hifz_daily_logs" | "id">;
};

export async function ensureHifzTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS hifz_plans_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      user_id TEXT NOT NULL,
      start_surah INTEGER NOT NULL,
      start_page INTEGER NOT NULL,
      total_pages INTEGER NOT NULL,
      pages_per_day REAL NOT NULL,
      selected_days TEXT NOT NULL,
      days_per_week INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      estimated_end_date TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      sync_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_hifz_plans_local_user
      ON hifz_plans_local(user_id, status);

    CREATE TABLE IF NOT EXISTS hifz_logs_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      user_id TEXT NOT NULL,
      hifz_plan_id INTEGER NOT NULL,
      actual_start_page INTEGER NOT NULL,
      actual_end_page INTEGER NOT NULL,
      actual_pages_completed INTEGER NOT NULL,
      date TEXT NOT NULL,
      log_day INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      sync_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, hifz_plan_id, date)
    );
  `);

  // JIT Column Check (Self-Healing)
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(hifz_logs_local)`);
  const hasMistakes = columns.some((c) => c.name === "mistakes_count");
  if (!hasMistakes) {
    try {
      await db.execAsync(`
        ALTER TABLE hifz_logs_local ADD COLUMN mistakes_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE hifz_logs_local ADD COLUMN hesitation_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE hifz_logs_local ADD COLUMN quality_score INTEGER;
      `);
      console.log("[DB] JIT Migration: hifz_logs_local columns added.");
    } catch (e) {
      // Might already be added by main init script
    }
  }
}

async function syncPendingPlans(db: SQLiteDatabase, userId: string) {
  const plans = await db.getAllAsync<any>(
    `SELECT * FROM hifz_plans_local WHERE user_id = ? AND sync_status = 0 ORDER BY id ASC`,
    [userId],
  );
  for (const plan of plans) {
    const payload = {
      user_id: plan.user_id,
      start_surah: plan.start_surah,
      start_page: plan.start_page,
      total_pages: plan.total_pages,
      pages_per_day: plan.pages_per_day,
      selected_days: JSON.parse(plan.selected_days ?? "[]"),
      days_per_week: plan.days_per_week,
      start_date: plan.start_date,
      estimated_end_date: plan.estimated_end_date,
      direction: plan.direction,
      status: plan.status,
    };
    const { data, error } = await supabase
      .from("hifz_plan")
      .upsert(
        {
          ...payload,
          local_id: plan.id,
        },
        { onConflict: "user_id,local_id" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await db.runAsync(
      `UPDATE hifz_plans_local SET sync_status = 1, remote_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [data?.id ? String(data.id) : null, plan.id],
    );
  }
}

async function syncPendingLogs(db: SQLiteDatabase, userId: string) {
  const logs = await db.getAllAsync<any>(
    `SELECT * FROM hifz_logs_local WHERE user_id = ? AND sync_status = 0 ORDER BY id ASC`,
    [userId],
  );
  for (const log of logs) {
    const remotePlan = await db.getFirstAsync<{ remote_id: string | null }>(
      `SELECT remote_id FROM hifz_plans_local WHERE id = ? LIMIT 1`,
      [log.hifz_plan_id],
    );
    const hifzPlanId = Number(remotePlan?.remote_id ?? log.hifz_plan_id);
    const { data, error } = await supabase
      .from("hifz_daily_logs")
      .upsert(
        {
          user_id: log.user_id,
          hifz_plan_id: hifzPlanId,
          actual_start_page: log.actual_start_page,
          actual_end_page: log.actual_end_page,
          actual_pages_completed: log.actual_pages_completed,
          date: log.date,
          log_day: log.log_day,
          status: log.status,
          notes: log.notes,
          mistakes_count: log.mistakes_count,
          hesitation_count: log.hesitation_count,
          quality_score: log.quality_score,
          local_id: log.id,
        },
        { onConflict: "user_id,hifz_plan_id,date" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await db.runAsync(
      `UPDATE hifz_logs_local SET sync_status = 1, remote_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [data?.id ? String(data.id) : null, log.id],
    );
  }
}

async function runHifzSync(db: SQLiteDatabase, userId: string) {
  try {
    await syncPendingPlans(db, userId);
    await syncPendingLogs(db, userId);
  } catch {
    // Offline-first: sync can fail silently and retry on next read/write.
  }
}

export const hifzServices = {
  async createPlan({ db, planData }: ICreate) {
    await ensureHifzTables(db);
    const userId = planData.user_id;
    if (!userId) throw new Error("Missing user id");
    let localId = 0;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE hifz_plans_local SET status = 'paused', sync_status = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'active'`,
        [userId],
      );
      const result = await db.runAsync(
        `
        INSERT INTO hifz_plans_local (
          remote_id, user_id, start_surah, start_page, total_pages, pages_per_day, selected_days, days_per_week,
          start_date, estimated_end_date, direction, status, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          null,
          userId,
          planData.start_surah,
          planData.start_page,
          planData.total_pages,
          planData.pages_per_day,
          JSON.stringify(planData.selected_days),
          planData.days_per_week,
          planData.start_date,
          planData.estimated_end_date,
          planData.direction,
          planData.status ?? "active",
        ],
      );
      localId = result.lastInsertRowId;
      await upsertActivityPlan(db, {
        userId,
        activityType: "HIFZ",
        status: "active",
        title: "Hifz Plan",
        startDate: planData.start_date,
        endDate: planData.estimated_end_date,
        localRefId: localId,
        metadata: JSON.stringify({
          pages_per_day: planData.pages_per_day,
          start_page: planData.start_page,
          total_pages: planData.total_pages,
        }),
      });
    });
    void runHifzSync(db, userId);
    return localId;
  },

  async getplan(db: SQLiteDatabase, userId: string): Promise<IHifzPlan | null> {
    if (!userId) return null;
    await ensureHifzTables(db);
    const localPlan = await db.getFirstAsync<any>(
      `
      SELECT *
      FROM hifz_plans_local
      WHERE user_id = ? AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );
    if (!localPlan) return null;
    const logs = await db.getAllAsync<IHifzLog>(
      `
      SELECT
        id,
        hifz_plan_id,
        actual_start_page,
        actual_end_page,
        actual_pages_completed,
        date,
        log_day,
        status,
        notes,
        mistakes_count,
        hesitation_count,
        quality_score
      FROM hifz_logs_local
      WHERE user_id = ? AND hifz_plan_id = ?
      ORDER BY date ASC
      `,
      [userId, localPlan.id],
    );
    void runHifzSync(db, userId);
    return {
      id: localPlan.id,
      user_id: localPlan.user_id,
      start_surah: localPlan.start_surah,
      start_page: localPlan.start_page,
      total_pages: localPlan.total_pages,
      pages_per_day: localPlan.pages_per_day,
      selected_days: JSON.parse(localPlan.selected_days ?? "[]"),
      days_per_week: localPlan.days_per_week,
      start_date: localPlan.start_date,
      estimated_end_date: localPlan.estimated_end_date,
      direction: localPlan.direction,
      status: localPlan.status,
      hifz_daily_logs: logs,
    };
  },

  async updateAndReplacePlan({ db, userId, newPlanData }: UpdatePlanPayload) {
    return await this.createPlan({
      db,
      planData: { ...newPlanData, user_id: userId, status: "active" },
    });
  },

  async todayLog(
    db: SQLiteDatabase,
    { todayLog, userId }: { todayLog: IHifzLog; userId?: string },
  ) {
    if (!userId) return;
    await ensureHifzTables(db);
    let localId = 0;
    let changed = false;
    let created = false;
    let previousStatus: IHifzLog["status"] | null = null;
    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{
        id: number;
        actual_start_page: number;
        actual_end_page: number;
        actual_pages_completed: number;
        log_day: number;
        status: IHifzLog["status"];
        notes: string | null;
        mistakes_count: number;
        hesitation_count: number;
        quality_score: number | null;
      }>(
        `
          SELECT id, actual_start_page, actual_end_page, actual_pages_completed, log_day, status, notes, mistakes_count, hesitation_count, quality_score
          FROM hifz_logs_local
          WHERE user_id = ? AND hifz_plan_id = ? AND date = ?
          LIMIT 1
        `,
        [userId, todayLog.hifz_plan_id, todayLog.date],
      );
      previousStatus = existing?.status ?? null;

      const sameAsExisting =
        !!existing &&
        Number(existing.actual_start_page ?? 0) === Number(todayLog.actual_start_page ?? 0) &&
        Number(existing.actual_end_page ?? 0) === Number(todayLog.actual_end_page ?? 0) &&
        Number(existing.actual_pages_completed ?? 0) === Number(todayLog.actual_pages_completed ?? 0) &&
        Number(existing.log_day ?? 0) === Number(todayLog.log_day ?? 0) &&
        existing.status === todayLog.status &&
        (existing.notes ?? null) === (todayLog.notes ?? null) &&
        Number(existing.mistakes_count ?? 0) === Number(todayLog.mistakes_count ?? 0) &&
        Number(existing.hesitation_count ?? 0) === Number(todayLog.hesitation_count ?? 0) &&
        existing.quality_score === (todayLog.quality_score ?? null);

      const mCount = todayLog.mistakes_count ?? 0;
      const hCount = todayLog.hesitation_count ?? 0;

      if (!todayLog.quality_score && (mCount > 0 || hCount > 0)) {
        // Deriving score: 5 is best, 1 is worst
        let score = 5;
        if (mCount >= 4) score = 1;
        else if (mCount >= 2) score = 2;
        else if (mCount >= 1 || hCount >= 3) score = 3;
        else if (hCount >= 1) score = 4;
        todayLog.quality_score = score;
      }

      if (sameAsExisting) {
        localId = existing.id;
        return;
      }

      await db.runAsync(
        `
        INSERT INTO hifz_logs_local (
          remote_id, user_id, hifz_plan_id, actual_start_page, actual_end_page, actual_pages_completed,
          date, log_day, status, notes, mistakes_count, hesitation_count, quality_score, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0), COALESCE(?, 0), ?, 0)
        ON CONFLICT(user_id, hifz_plan_id, date) DO UPDATE SET
          actual_start_page = excluded.actual_start_page,
          actual_end_page = excluded.actual_end_page,
          actual_pages_completed = excluded.actual_pages_completed,
          log_day = excluded.log_day,
          status = excluded.status,
          notes = excluded.notes,
          mistakes_count = COALESCE(excluded.mistakes_count, 0),
          hesitation_count = COALESCE(excluded.hesitation_count, 0),
          quality_score = excluded.quality_score,
          sync_status = 0,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          null,
          userId,
          todayLog.hifz_plan_id,
          todayLog.actual_start_page,
          todayLog.actual_end_page,
          todayLog.actual_pages_completed,
          todayLog.date,
          todayLog.log_day,
          todayLog.status,
          todayLog.notes ?? null,
          todayLog.mistakes_count ?? 0,
          todayLog.hesitation_count ?? 0,
          todayLog.quality_score ?? null,
        ],
      );
      const persisted = await db.getFirstAsync<{ id: number }>(
        `
          SELECT id
          FROM hifz_logs_local
          WHERE user_id = ? AND hifz_plan_id = ? AND date = ?
          LIMIT 1
        `,
        [userId, todayLog.hifz_plan_id, todayLog.date],
      );
      localId = persisted?.id ?? existing?.id ?? 0;
      changed = true;
      created = !existing;
      const normalizedUnits = Math.max(0, Math.round(todayLog.actual_pages_completed ?? 0));
      const isMissed = todayLog.status === "missed" || normalizedUnits === 0;
      await insertHabitProgressLog(db, {
        userId,
        date: todayLog.date,
        activityType: "HIFZ",
        minutesSpent: isMissed ? 0 : Math.max(1, normalizedUnits) * 3,
        unitsCompleted: isMissed ? 0 : normalizedUnits,
        note: todayLog.notes ?? null,
        planId: todayLog.hifz_plan_id,
        localRefId: localId,
        eventType: isMissed ? "TASK_MISSED" : "HIFZ_COMPLETED",
      });

      // Update Page Performance
      if (!isMissed && todayLog.actual_pages_completed > 0) {
        const quality = todayLog.quality_score ?? PerformanceService.deriveQualityScore(todayLog.mistakes_count ?? 0, todayLog.hesitation_count ?? 0);
        await PerformanceService.updateRangePerformance(
          db,
          todayLog.actual_start_page,
          todayLog.actual_end_page,
          quality
        );

        // Gamification: Award XP and Rewards
        const stats = await db.getFirstAsync<{ current_streak: number }>(
          "SELECT current_streak FROM user_stats WHERE user_id = ?",
          [userId]
        );
        await GamificationService.processSessionCompletion(
          db,
          userId,
          quality,
          stats?.current_streak ?? 0
        );
      }
    });
    if (changed) {
      void runHifzSync(db, userId);
    }
    return { id: localId, changed, created, previousStatus, currentStatus: todayLog.status };
  },
};
