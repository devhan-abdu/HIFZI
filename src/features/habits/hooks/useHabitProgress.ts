import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
;
import { useSession } from "@/src/hooks/useSession";

import { habitAnalyticsService } from "../services/habitAnalyticsService";
import { HabitRepository } from "../services/habitRepository";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useHabitProgress(viewDate?: Date) {
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
      if (!user?.id) return null;

      const [snapshot, unsynced] = await Promise.all([
        habitAnalyticsService.getProgressSnapshot(userId, dateKey(startOfMonth), dateKey(endOfMonth)),
        new HabitRepository().getPendingLogs(userId),
      ]);

      if (unsynced.length > 0) {
        try {
          await new HabitRepository().syncPendingLogs(userId);
        } catch (e) {
          console.warn("Habit sync deferred:", e);
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
