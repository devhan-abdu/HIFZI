import { create } from "zustand";
import type { SyncErrorDetail, SyncStatusState } from "./types";

const initialState: SyncStatusState = {
  isSyncing: false,
  isOnline: true,
  lastSyncedAt: null,
  lastPullAt: null,
  lastPushAt: null,
  hasRemoteChanges: false,
  syncError: null,
  recentErrors: [],
  hasSyncedOnce: false,
};

export const useSyncStore = create<
  SyncStatusState & {
    setPatch: (patch: Partial<SyncStatusState>) => void;
    pushError: (error: SyncErrorDetail) => void;
    clearErrors: () => void;
    reset: () => void;
  }
>((set) => ({
  ...initialState,
  setPatch: (patch) => set((state) => ({ ...state, ...patch })),
  pushError: (error) =>
    set((state) => ({
      recentErrors: [error, ...state.recentErrors].slice(0, 20),
      syncError: error.message,
    })),
  clearErrors: () => set({ syncError: null, recentErrors: [] }),
  reset: () => set(initialState),
}));
