import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { activityLogs, pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { habitEvents } from "@/src/features/notifications/database/notificationSchema";
import { eq, and } from "drizzle-orm";
import type { RemoteSyncRow } from "./types";
import { compareUpdatedAt, remoteUpdatedAt } from "./utils";

export async function pullHabitLogs(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("habit_logs").select("*").eq("user_id", userId);
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

    const local = await db.query.activityLogs.findFirst({
      where: eq(activityLogs.id, localId),
    });

    if (local && local.isSynced === 0) continue;

    const remoteAt = remoteUpdatedAt(row);
    if (local && compareUpdatedAt(remoteAt, local.updatedAt) <= 0) continue;

    const values = {
      userId,
      date: String(row.date),
      activityType: (row.activity_type as any) ?? "NORMAL_READING",
      minutesSpent: Number(row.minutes_spent ?? 0),
      unitsCompleted: Number(row.units_completed ?? 0),
      note: (row.note as string | null) ?? null,
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      isSynced: 1,
      updatedAt: remoteAt,
    };

    if (local) {
      await db.update(activityLogs).set(values).where(eq(activityLogs.id, localId));
    } else {
      await db.insert(activityLogs).values({ ...values, id: localId });
    }

    changed = true;
  }

  return changed;
}

export async function pullHabitEvents(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("habit_events").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    // We match habit_events by user_id, habit_type, date
    const habitType = String(row.habit_type);
    const date = String(row.date);

    let local = await db.query.habitEvents.findFirst({
      where: and(
        eq(habitEvents.userId, userId),
        eq(habitEvents.habitType, habitType as any),
        eq(habitEvents.date, date)
      ),
    });

    if (local && local.syncStatus === 0) continue;

    const remoteAt = remoteUpdatedAt(row);
    if (local && compareUpdatedAt(remoteAt, local.updatedAt) <= 0) continue;

    const values = {
      userId,
      habitType: habitType as "hifz" | "muraja",
      status: String(row.status) as "completed" | "partial" | "missed",
      date,
      xpGained: Number(row.xp_gained ?? 0),
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      syncStatus: 1,
      updatedAt: remoteAt,
    };

    if (local) {
      await db.update(habitEvents).set(values).where(eq(habitEvents.id, local.id));
    } else {
      const localId = Number(row.local_id);
      if (localId) {
          await db.insert(habitEvents).values({ ...values, id: localId });
      } else {
          await db.insert(habitEvents).values(values);
      }
    }

    changed = true;
  }

  return changed;
}

export async function pullPageActivityLogs(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("page_activity_logs").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const localLogId = Number(row.local_log_id);
    const source = String(row.source);
    
    // There is no sync_status for page_activity_logs natively, 
    // it's an append-only log. We just insert if it doesn't exist locally.
    
    let local = await db.query.pageActivityLogs.findFirst({
      where: and(
        eq(pageActivityLogs.userId, userId),
        eq(pageActivityLogs.source, source as any),
        eq(pageActivityLogs.localLogId, localLogId)
      ),
    });

    if (local) continue;

    const values = {
      userId,
      pageId: Number(row.page_id),
      source: source as "hifz" | "muraja",
      localLogId,
      logDate: String(row.log_date),
      sessionQuality: String(row.session_quality) as "perfect" | "medium" | "low",
      mistakesCount: Number(row.mistakes_count ?? 0),
      hesitationsCount: Number(row.hesitations_count ?? 0),
      createdAt: String(row.created_at ?? new Date().toISOString()),
    };

    await db.insert(pageActivityLogs).values(values);
    changed = true;
  }

  return changed;
}
