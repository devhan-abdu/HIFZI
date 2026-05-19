import { db } from "@/src/lib/db/local-client";
import { quranSyncState } from "@/src/features/quran/database/quranStateSchema";
import { eq, sql } from "drizzle-orm";

const META_KEYS = {
  lastPullAt: "sync:last_pull_at",
  lastPushAt: "sync:last_push_at",
  lastSyncedAt: "sync:last_synced_at",
} as const;

async function getMeta(key: string): Promise<string | null> {
  const row = await db.query.quranSyncState.findFirst({
    where: eq(quranSyncState.key, key),
  });
  return row?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  await db
    .insert(quranSyncState)
    .values({ key, value, updatedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({
      target: quranSyncState.key,
      set: { value, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}

export const syncMeta = {
  async getLastPullAt(): Promise<string | null> {
    return getMeta(META_KEYS.lastPullAt);
  },
  async getLastPushAt(): Promise<string | null> {
    return getMeta(META_KEYS.lastPushAt);
  },
  async getLastSyncedAt(): Promise<string | null> {
    return getMeta(META_KEYS.lastSyncedAt);
  },
  async setLastPullAt(iso: string): Promise<void> {
    await setMeta(META_KEYS.lastPullAt, iso);
  },
  async setLastPushAt(iso: string): Promise<void> {
    await setMeta(META_KEYS.lastPushAt, iso);
  },
  async setLastSyncedAt(iso: string): Promise<void> {
    await setMeta(META_KEYS.lastSyncedAt, iso);
  },
  async clearTimestamps(): Promise<void> {
    for (const key of Object.values(META_KEYS)) {
      await db.delete(quranSyncState).where(eq(quranSyncState.key, key));
    }
  },
};
