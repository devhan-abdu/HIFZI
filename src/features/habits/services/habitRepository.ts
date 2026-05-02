import { supabase } from "@/src/lib/supabase";
import { db } from "@/src/lib/db/local-client";
import { activityLogs } from "../database/habitSchema";
import { eq, and, asc } from "drizzle-orm";
import { habitProgressService } from "./habitProgressService";
import { HabitType } from "./habitTypes";

export class HabitRepository {
  private remoteActivitySyncUnavailable = false;


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
    return habitProgressService.upsertHabitProgressLog(db, payload);
  }

 
  async getPendingLogs(userId: string) {
    return await db.query.activityLogs.findMany({
      where: and(eq(activityLogs.userId, userId), eq(activityLogs.isSynced, 0)),
      orderBy: [asc(activityLogs.id)],
      limit: 200,
    });
  }


  async markSynced(id: number, remoteId: string | null) {
    await db.update(activityLogs)
      .set({ isSynced: 1, remoteId, updatedAt: new Date().toISOString() })
      .where(eq(activityLogs.id, id));
  }

 
  async syncPendingLogs(userId: string) {
    if (this.remoteActivitySyncUnavailable) return;
    
    const pending = await this.getPendingLogs(userId);
    for (const log of pending) {
      try {
        await this.syncSingleLog(log as any);
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

  private async syncSingleLog(log: any) {
    const basePayload = {
      local_id: log.id,
      user_id: log.userId,
      date: log.date,
      activity_type: log.activityType,
      minutes_spent: log.minutesSpent,
      units_completed: log.unitsCompleted,
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
            habit_type: log.activityType.toLowerCase(),
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
