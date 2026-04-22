import { SQLiteDatabase } from "expo-sqlite";
import { IDailyMurajaLog, IMurajaDashboardData, IWeeklyMurajaPLan } from "../types";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";

export type LocalMurajaLogWriteResult = {
  localLogId: number | null;
  changed: boolean;
  created: boolean;
  previousStatus: IDailyMurajaLog["status"] | null;
  currentStatus: IDailyMurajaLog["status"] | "pending" | null;
};

export async function ensureMurajaTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weekly_muraja_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      user_id TEXT,
      week_start_date TEXT,
      week_end_date TEXT,
      planned_pages_per_day INTEGER,
      start_page INTEGER,
      end_page INTEGER,
      is_active BOOLEAN DEFAULT 1,
      selected_days TEXT,
      sync_status INTEGER DEFAULT 1,
      estimated_time_min INTEGER,
      place TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_muraja_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      plan_id INTEGER,
      date TEXT,
      completed_pages INTEGER DEFAULT 0,
      actual_time_min INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('completed', 'partial', 'missed')),
      is_catchup BOOLEAN DEFAULT 0,
      sync_status INTEGER DEFAULT 0,
      start_page INTEGER,
      mistakes_count INTEGER NOT NULL DEFAULT 0,
      hesitation_count INTEGER NOT NULL DEFAULT 0,
      quality_score INTEGER,
      FOREIGN KEY(plan_id) REFERENCES weekly_muraja_plan(id)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_muraja_logs_plan_date
      ON daily_muraja_logs(plan_id, date);
  `);
}

export const localMurajaService = {
  async createPlan(db: SQLiteDatabase, planData: Omit<IWeeklyMurajaPLan, "id">) {
    await ensureMurajaTables(db);

    let lastId = 0;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE weekly_muraja_plan SET is_active = 0 WHERE user_id = ? AND is_active = 1",
        [planData.user_id],
      );

      const result = await db.runAsync(
        `
          INSERT INTO weekly_muraja_plan (
            remote_id,
            user_id,
            week_start_date,
            week_end_date,
            planned_pages_per_day,
            start_page,
            end_page,
            is_active,
            selected_days,
            sync_status,
            estimated_time_min,
            place,
            note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          null,
          planData.user_id,
          planData.week_start_date,
          planData.week_end_date,
          planData.planned_pages_per_day,
          planData.start_page,
          planData.end_page,
          1,
          planData.selected_days,
          0,
          planData.estimated_time_min,
          planData.place ?? null,
          planData.note ?? null,
        ],
      );
      lastId = result.lastInsertRowId;

      await db.runAsync(
        `
          INSERT INTO user_stats (user_id, muraja_last_page)
          VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            muraja_last_page = excluded.muraja_last_page
        `,
        [planData.user_id, planData.start_page - 1],
      );
    });

    return lastId;
  },

  async getDahsboardState(db: SQLiteDatabase, userId: string) {
    await ensureMurajaTables(db);

    const plan = await db.getFirstAsync<IMurajaDashboardData>(
      `
        SELECT
          p.*,
          s.muraja_last_page,
          s.muraja_current_streak
        FROM weekly_muraja_plan p
        LEFT JOIN user_stats s ON p.user_id = s.user_id
        WHERE p.user_id = ? AND p.is_active = 1
        LIMIT 1
      `,
      [userId],
    );
    if (!plan) return;

    const logs = await db.getAllAsync<IDailyMurajaLog>(
      `
        SELECT *
        FROM daily_muraja_logs
        WHERE plan_id = ?
        ORDER BY date ASC
      `,
      [plan.id],
    );

    return {
      ...plan,
      daily_logs: logs,
    };
  },

  async upsertLog(
    db: SQLiteDatabase,
    userId: string,
    log: IDailyMurajaLog,
  ): Promise<LocalMurajaLogWriteResult> {
    await ensureMurajaTables(db);

    let localLogId: number | null = null;
    let changed = false;
    let created = false;
    let previousStatus: IDailyMurajaLog["status"] | null = null;
    let currentStatus: IDailyMurajaLog["status"] | "pending" | null = null;

    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{
        id: number;
        completed_pages: number;
        status: IDailyMurajaLog["status"];
        actual_time_min: number;
        is_catchup: number;
        start_page: number;
        mistakes_count: number;
        hesitation_count: number;
        quality_score: number | null;
      }>(
        `
          SELECT id, completed_pages, status, actual_time_min, is_catchup, start_page, mistakes_count, hesitation_count, quality_score
          FROM daily_muraja_logs
          WHERE date = ? AND plan_id = ?
          LIMIT 1
        `,
        [log.date, log.plan_id],
      );

      previousStatus = existing?.status ?? null;

      if (log.status === "pending" && (log.completed_pages ?? 0) <= 0) {
        if (existing?.id) {
          await db.runAsync(`DELETE FROM daily_muraja_logs WHERE id = ?`, [existing.id]);
          localLogId = existing.id;
          changed = true;
          currentStatus = "pending";
        }

        const fallbackLastPage = await db.getFirstAsync<{ page: number }>(
          `SELECT start_page - 1 as page FROM weekly_muraja_plan WHERE id = ? LIMIT 1`,
          [log.plan_id],
        );
        const latestProgress = await db.getFirstAsync<{ page: number }>(
          `
            SELECT MAX(start_page + completed_pages - 1) as page
            FROM daily_muraja_logs
            WHERE plan_id = ? AND completed_pages > 0
          `,
          [log.plan_id],
        );

        await db.runAsync(
          `
            INSERT INTO user_stats (user_id, muraja_last_page)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              muraja_last_page = excluded.muraja_last_page
          `,
          [userId, latestProgress?.page ?? fallbackLastPage?.page ?? 0],
        );
        return;
      }

      const sameAsExisting =
        !!existing &&
        Number(existing.completed_pages ?? 0) === Number(log.completed_pages ?? 0) &&
        existing.status === log.status &&
        Number(existing.actual_time_min ?? 0) === Number(log.actual_time_min ?? 0) &&
        Number(existing.is_catchup ?? 0) === Number(log.is_catchup ?? 0) &&
        Number(existing.start_page ?? 0) === Number(log.start_page ?? 0) &&
        Number(existing.mistakes_count ?? 0) === Number(log.mistakes_count ?? 0) &&
        Number(existing.hesitation_count ?? 0) === Number(log.hesitation_count ?? 0) &&
        existing.quality_score === (log.quality_score ?? null);

      if (sameAsExisting) {
        localLogId = existing.id;
        currentStatus = existing.status;
        return;
      }

      if (existing?.id) {
        await db.runAsync(
          `
            UPDATE daily_muraja_logs
            SET completed_pages = ?,
                status = ?,
                actual_time_min = ?,
                is_catchup = ?,
                start_page = ?,
                mistakes_count = ?,
                hesitation_count = ?,
                quality_score = ?,
                sync_status = ?,
                remote_id = NULL
            WHERE id = ?
          `,
          [
            log.completed_pages,
            log.status,
            log.actual_time_min,
            log.is_catchup,
            log.start_page,
            log.mistakes_count,
            log.hesitation_count,
            log.quality_score ?? null,
            0,
            existing.id,
          ],
        );
        localLogId = existing.id;
        changed = true;
      } else {
        const result = await db.runAsync(
          `
            INSERT INTO daily_muraja_logs (
              date, plan_id, start_page, completed_pages,
              sync_status, is_catchup, actual_time_min, status,
              mistakes_count, hesitation_count, quality_score, remote_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            log.date,
            log.plan_id,
            log.start_page,
            log.completed_pages,
            0,
            log.is_catchup,
            log.actual_time_min,
            log.status,
            log.mistakes_count,
            log.hesitation_count,
            log.quality_score ?? null,
            null,
          ],
        );
        localLogId = result.lastInsertRowId;
        changed = true;
        created = true;
      }

      currentStatus = log.status;

      await db.runAsync(
        `
          INSERT INTO user_stats (user_id, muraja_last_page)
          VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            muraja_last_page = excluded.muraja_last_page
        `,
        [userId, log.start_page + log.completed_pages - 1],
      );

      // Update Page Performance
      if (log.completed_pages > 0) {
        const quality = log.quality_score ?? PerformanceService.deriveQualityScore(log.mistakes_count, log.hesitation_count);
        await PerformanceService.updateRangePerformance(
          db,
          log.start_page,
          log.start_page + log.completed_pages - 1,
          quality
        );

        // Gamification: Award XP and Rewards
        const stats = await db.getFirstAsync<{ muraja_current_streak: number }>(
          "SELECT muraja_current_streak FROM user_stats WHERE user_id = ?",
          [userId]
        );
        await GamificationService.processSessionCompletion(
          db,
          userId,
          quality,
          stats?.muraja_current_streak ?? 0
        );
      }
    });

    return {
      localLogId,
      changed,
      created,
      previousStatus,
      currentStatus,
    };
  },
};
