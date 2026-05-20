export type SyncTableName =
  | "hifz_plans"
  | "hifz_logs"
  | "muraja_plans"
  | "muraja_logs"
  | "activity_logs"
  | "notifications"
  | "habit_events"
  | "all";

export interface SyncErrorDetail {
  table: SyncTableName;
  rowId: string | number;
  code?: string;
  message: string;
}

export interface SyncStatusState {
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  lastPullAt: string | null;
  lastPushAt: string | null;
  hasRemoteChanges: boolean;
  syncError: string | null;
  recentErrors: SyncErrorDetail[];
  /** True after the first pull cycle on login has completed */
  hasSyncedOnce: boolean;
}

export interface RemoteSyncRow {
  id?: number | string;
  local_id?: number | null;
  user_id?: string;
  updated_at?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  sync_version?: number | null;
  [key: string]: unknown;
}
