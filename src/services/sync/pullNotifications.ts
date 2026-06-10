import { db } from "@/src/lib/db/local-client";
import { supabase } from "@/src/lib/supabase";
import { notifications } from "@/src/features/notifications/database/notificationSchema";
import { eq, and } from "drizzle-orm";
import type { RemoteSyncRow } from "./types";
import { compareUpdatedAt, remoteUpdatedAt } from "./utils";

export async function pullNotifications(
  userId: string,
  since: string | null,
): Promise<boolean> {
  let query = supabase.from("notifications").select("*").eq("user_id", userId);
  if (since) {
    query = query.gt("updated_at", since);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return false;

  let changed = false;

  for (const row of data as RemoteSyncRow[]) {
    const eventKey = String(row.event_key);

    let local = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.eventKey, eventKey)
      ),
    });

    if (local && local.syncStatus === 0) continue;

    const remoteAt = remoteUpdatedAt(row);
    if (local && compareUpdatedAt(remoteAt, local.updatedAt) <= 0) continue;

    const values = {
      userId,
      type: String(row.type) as "xp" | "warning" | "milestone",
      title: String(row.title),
      message: String(row.message),
      isRead: row.is_read ? 1 : 0,
      eventKey,
      remoteId: row.id != null ? String(row.id) : local?.remoteId ?? null,
      syncStatus: 1,
      updatedAt: remoteAt,
    };

    if (local) {
      await db.update(notifications).set(values).where(eq(notifications.id, local.id));
    } else {
      const localId = Number(row.local_id);
      if (localId) {
          await db.insert(notifications).values({ ...values, id: localId });
      } else {
          await db.insert(notifications).values(values);
      }
    }

    changed = true;
  }

  return changed;
}
