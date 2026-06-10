import { supabase } from "@/src/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { HabitRepository } from "@/src/features/habits/services/habitRepository";
import { notificationService } from "@/src/features/notifications/services/notificationService";
import { pushHifzLogs, pushHifzPlans } from "./pushHifz";
import { pushMurajaLogs, pushMurajaPlans } from "./pushMuraja";
import { pullHifzLogs, pullHifzPlans } from "./pullHifz";
import { pullMurajaLogs, pullMurajaPlans } from "./pullMuraja";
import { pushUserStats, pushPagePerformance } from "./pushUser";
import { pullUserStats, pullPagePerformance } from "./pullUser";
import { pushPageActivityLogs } from "./pushHabits";
import { pullHabitLogs, pullHabitEvents, pullPageActivityLogs } from "./pullHabits";
import { pullNotifications } from "./pullNotifications";
import { syncMeta } from "./syncMeta";
import { useSyncStore } from "./syncStore";
import type { RemoteSyncRow, SyncTableName } from "./types";
import { isAuthError, withRetry } from "./utils";

const SYNC_TABLES_REALTIME = [
  "hifz_plan",
  "hifz_daily_logs",
  "weekly_muraja_plan",
  "daily_muraja_logs",
] as const;

class SyncEngine {
  private userId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private syncInFlight: Promise<void> | null = null;
  private habitRepo = new HabitRepository();

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  async push(table: SyncTableName = "all"): Promise<void> {
    if (!this.userId) return;
    await this.runSyncCycle({ pushOnly: table });
  }

  async pull(table: SyncTableName = "all"): Promise<void> {
    if (!this.userId) return;
    await this.runSyncCycle({ pullOnly: table });
  }

  async fullSync(): Promise<void> {
    if (!this.userId) return;
    await this.runSyncCycle({ full: true });
  }

  /** Login: pull first, then push */
  async onLogin(userId: string): Promise<void> {
    this.userId = userId;
    await this.runSyncCycle({ pullFirst: true });
    await this.subscribeRealtime(userId);
  }

  async onLogout(): Promise<void> {
    await this.unsubscribeRealtime();
    await syncMeta.clearTimestamps();
    this.userId = null;
    useSyncStore.getState().reset();
  }

  async subscribeRealtime(userId: string) {
    await this.unsubscribeRealtime();

    const chan = supabase
      .channel(`hifzi-sync-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hifz_plan", filter: `user_id=eq.${userId}` },
        (payload) => void this.handleRealtimeRow("hifz_plans", payload.new as RemoteSyncRow),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hifz_daily_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => void this.handleRealtimeRow("hifz_logs", payload.new as RemoteSyncRow),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_muraja_plan",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => void this.handleRealtimeRow("muraja_plans", payload.new as RemoteSyncRow),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_muraja_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => void this.handleRealtimeRow("muraja_logs", payload.new as RemoteSyncRow),
      );

    this.channel = chan;
    chan.subscribe();
  }

  private async handleRealtimeRow(table: SyncTableName, row: RemoteSyncRow | null) {
    if (!this.userId || !row) return;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sync] Realtime DELETE should not occur; use soft deletes.", table);
    }
    useSyncStore.getState().setPatch({ hasRemoteChanges: true });
    await this.runSyncCycle({ pullOnly: table });
  }

  private async unsubscribeRealtime() {
    if (this.channel) {
      const chan = this.channel;
      this.channel = null;
      try {
        await supabase.removeChannel(chan);
      } catch (err) {
        console.warn("[sync] Error removing channel:", err);
      }
    }
  }

  onAppForeground() {
    // Only pull incremental changes when returning to the app
    void this.runSyncCycle({ full: false });
  }

  onNetworkReconnect() {
    void this.runSyncCycle({ full: false });
  }

  private async runSyncCycle(options: {
    full?: boolean;
    pullFirst?: boolean;
    pushOnly?: SyncTableName;
    pullOnly?: SyncTableName;
  }) {
    if (!this.userId) return;
    if (this.syncInFlight) return this.syncInFlight;

    this.syncInFlight = this.executeSync(options).finally(() => {
      this.syncInFlight = null;
    });
    return this.syncInFlight;
  }

  private async executeSync(options: {
    full?: boolean;
    pullFirst?: boolean;
    pushOnly?: SyncTableName;
    pullOnly?: SyncTableName;
  }) {
    const userId = this.userId!;
    const store = useSyncStore.getState();
    store.setPatch({ isSyncing: true, syncError: null });

    try {
      await withRetry(async () => {
        const sincePull = options.full ? null : await syncMeta.getLastPullAt();
        const sincePush = options.full ? null : await syncMeta.getLastPushAt();

        const runPull = async () => {
          let remoteChanged = false;
          if (!options.pushOnly || options.pushOnly === "all") {
            remoteChanged =
              (await pullHifzPlans(userId, sincePull)) ||
              (await pullHifzLogs(userId, sincePull)) ||
              (await pullMurajaPlans(userId, sincePull)) ||
              (await pullMurajaLogs(userId, sincePull)) ||
              (await pullUserStats(userId, sincePull)) ||
              (await pullPagePerformance(userId, sincePull)) ||
              (await pullHabitLogs(userId, sincePull)) ||
              (await pullHabitEvents(userId, sincePull)) ||
              (await pullPageActivityLogs(userId, sincePull)) ||
              (await pullNotifications(userId, sincePull)) ||
              remoteChanged;
          } else if (options.pullOnly === "hifz_plans") {
            remoteChanged = await pullHifzPlans(userId, sincePull);
          } else if (options.pullOnly === "hifz_logs") {
            remoteChanged = await pullHifzLogs(userId, sincePull);
          } else if (options.pullOnly === "muraja_plans") {
            remoteChanged = await pullMurajaPlans(userId, sincePull);
          } else if (options.pullOnly === "muraja_logs") {
            remoteChanged = await pullMurajaLogs(userId, sincePull);
          } else if (options.pullOnly === "user_stats") {
            remoteChanged = await pullUserStats(userId, sincePull);
          } else if (options.pullOnly === "page_performance") {
            remoteChanged = await pullPagePerformance(userId, sincePull);
          } else if (options.pullOnly === "activity_logs") {
            remoteChanged = await pullHabitLogs(userId, sincePull);
          } else if (options.pullOnly === "habit_events") {
            remoteChanged = await pullHabitEvents(userId, sincePull);
          } else if (options.pullOnly === "page_activity_logs") {
            remoteChanged = await pullPageActivityLogs(userId, sincePull);
          } else if (options.pullOnly === "notifications") {
            remoteChanged = await pullNotifications(userId, sincePull);
          }

          const now = new Date().toISOString();
          await syncMeta.setLastPullAt(now);
          useSyncStore.getState().setPatch({
            lastPullAt: now,
            hasSyncedOnce: true,
            hasRemoteChanges: remoteChanged || useSyncStore.getState().hasRemoteChanges,
          });
        };

        const runPush = async () => {
          if (!options.pullOnly || options.pullOnly === "all") {
            await pushHifzPlans(userId);
            await pushHifzLogs(userId);
            await pushMurajaPlans(userId);
            await pushMurajaLogs(userId);
            await pushUserStats(userId);
            await pushPagePerformance(userId);
            await pushPageActivityLogs(userId);
            await this.habitRepo.syncPendingLogs(userId);
            await notificationService.syncWithRemote(userId);
          } else if (options.pushOnly === "hifz_plans") {
            await pushHifzPlans(userId);
          } else if (options.pushOnly === "hifz_logs") {
            await pushHifzLogs(userId);
          } else if (options.pushOnly === "muraja_plans") {
            await pushMurajaPlans(userId);
          } else if (options.pushOnly === "muraja_logs") {
            await pushMurajaLogs(userId);
          } else if (options.pushOnly === "user_stats") {
            await pushUserStats(userId);
          } else if (options.pushOnly === "page_performance") {
            await pushPagePerformance(userId);
          } else if (options.pushOnly === "activity_logs") {
            await this.habitRepo.syncPendingLogs(userId);
          } else if (options.pushOnly === "page_activity_logs") {
            await pushPageActivityLogs(userId);
          } else if (options.pushOnly === "notifications" || options.pushOnly === "habit_events") {
            await notificationService.syncWithRemote(userId);
          }

          const now = new Date().toISOString();
          await syncMeta.setLastPushAt(now);
          useSyncStore.getState().setPatch({ lastPushAt: now });
        };

        if (options.pullFirst) {
          await runPull();
          await runPush();
        } else if (options.pullOnly) {
          await runPull();
        } else if (options.pushOnly && options.pushOnly !== "all") {
          await runPush();
        } else {
          await runPush();
          await runPull();
        }

        const syncedAt = new Date().toISOString();
        await syncMeta.setLastSyncedAt(syncedAt);
        useSyncStore.getState().setPatch({
          lastSyncedAt: syncedAt,
          isOnline: true,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      if (isAuthError(error as Error)) {
        useSyncStore.getState().setPatch({
          syncError: "Session expired. Please sign in again.",
          isOnline: true,
        });
        return;
      }
      useSyncStore.getState().setPatch({
        syncError: message,
        isOnline: false,
      });
    } finally {
      useSyncStore.getState().setPatch({ isSyncing: false });
    }
  }
}

export const syncEngine = new SyncEngine();

export const sync = {
  push: (table?: SyncTableName) => syncEngine.push(table ?? "all"),
  pull: (table?: SyncTableName) => syncEngine.pull(table ?? "all"),
  full: () => syncEngine.fullSync(),
  onLogin: (userId: string) => syncEngine.onLogin(userId),
  onLogout: () => syncEngine.onLogout(),
  onForeground: () => syncEngine.onAppForeground(),
  onReconnect: () => syncEngine.onNetworkReconnect(),
};

export { SYNC_TABLES_REALTIME };
