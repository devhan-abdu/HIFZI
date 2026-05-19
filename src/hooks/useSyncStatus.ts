import { useSyncStore } from "@/src/services/sync/syncStore";

export function useSyncStatus() {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const isOnline = useSyncStore((s) => s.isOnline);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const hasRemoteChanges = useSyncStore((s) => s.hasRemoteChanges);
  const syncError = useSyncStore((s) => s.syncError);

  return {
    isSyncing,
    isOnline,
    lastSyncedAt,
    hasRemoteChanges,
    syncError,
  };
}
