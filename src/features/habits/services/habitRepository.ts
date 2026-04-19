import { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/src/lib/supabase";
import {
  HabitProgressLog,
  insertHabitProgressLog,
  getUnsyncedHabitLogs,
  markHabitLogSynced,
  HabitType,
} from "./habitProgressService";

export class HabitRepository {
  private remoteActivitySyncUnavailable = false;

  constructor(private readonly db: SQLiteDatabase) {}

  async writeLocalLog(payload: {
    userId: string;
    date: string;
    activityType: HabitType;
    minutesSpent: number;
    unitsCompleted: number;
    note?: string | null;
    planId?: number | null;
    metadata?: string | null;
    localRefId?: number | null;
  }) {
    return insertHabitProgressLog(this.db, payload);
  }

  async getPendingLogs(userId: string) {
    return getUnsyncedHabitLogs(this.db, userId);
  }

  async markSynced(id: number, remoteId: string | null) {
    return markHabitLogSynced(this.db, id, remoteId);
  }

  async syncPendingLogs(userId: string) {
    if (this.remoteActivitySyncUnavailable) return;
    const pending = await this.getPendingLogs(userId);
    for (const log of pending) {
      try {
        await this.syncSingleLog(log);
      } catch (error: any) {
        if (this.isMissingRemoteTableError(error)) {
          this.remoteActivitySyncUnavailable = true;
          return;
        }
        throw error;
      }
    }
  }

  private isMissingRemoteTableError(error: any) {
    return error?.code === "PGRST205";
  }

  private async syncSingleLog(log: HabitProgressLog) {
    const basePayload = {
      local_id: log.id,
      user_id: log.user_id,
      date: log.date,
      activity_type: log.activity_type,
      minutes_spent: log.minutes_spent,
      units_completed: log.units_completed,
      note: log.note,
    };
    const firstAttempt = await supabase
      .from("habit_logs")
      .upsert(basePayload, { onConflict: "user_id,local_id" })
      .select("id")
      .single();

    if (firstAttempt.error) {
      if (this.isMissingRemoteTableError(firstAttempt.error)) {
        throw firstAttempt.error;
      }
      const fallback = await supabase
        .from("habit_logs")
        .upsert(
          {
            ...basePayload,
            habit_type: log.activity_type.toLowerCase(),
          },
          { onConflict: "user_id,local_id" },
        )
        .select("id")
        .single();
      if (fallback.error) throw fallback.error;
      await this.markSynced(log.id, fallback.data?.id ? String(fallback.data.id) : null);
      return;
    }

    await this.markSynced(log.id, firstAttempt.data?.id ? String(firstAttempt.data.id) : null);
  }
}
