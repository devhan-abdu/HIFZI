import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useSession } from "@/src/hooks/useSession";
import {
  getHabitProgressSnapshot,
} from "../services/habitProgressService";
import { HabitRepository } from "../services/habitRepository";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useHabitProgress(viewDate?: Date) {
  const db = useSQLiteContext();
  const { user } = useSession();
  const userId = user?.id ?? "local-user";
  const focusDate = viewDate ?? new Date();
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const query = useQuery({
    queryKey: ["habit-progress", userId, dateKey(startOfMonth), dateKey(endOfMonth)],
    queryFn: async () => {
      const [snapshot, unsynced] = await Promise.all([
        getHabitProgressSnapshot(db, userId, dateKey(startOfMonth), dateKey(endOfMonth)),
        new HabitRepository(db).getPendingLogs(userId),
      ]);

      if (unsynced.length > 0) {
        try {
          await new HabitRepository(db).syncPendingLogs(userId);
        } catch {
          // Keep offline-first behavior; sync later.
        }
      }

      return snapshot;
    },
    enabled: !!user?.id,
  });

  const data = useMemo(
    () =>
      query.data ?? {
        userHistory: [],
        weekHistory: [],
        historyEntries: [],
        heatmap: [],
        reflections: [],
        analytics: {
          completionRate: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalMinutes: 0,
          totalPages: 0,
          completedCount: 0,
          missedCount: 0,
          revisionFrequency: 0,
        },
        progressByType: {
          HIFZ: { minutes: 0, units: 0, sessions: 0 },
          MURAJA: { minutes: 0, units: 0, sessions: 0 },
          NORMAL_READING: { minutes: 0, units: 0, sessions: 0 },
        },
        activityHash: "v1-0",
        lastActivityAt: null,
      },
    [query.data],
  );

  return {
    ...data,
    loading: query.isLoading,
    isLoading: query.isLoading,
    error: query.isError,
    isError: query.isError,
    refetch: query.refetch,
  };
}
