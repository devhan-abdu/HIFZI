import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { UserHabitStats } from "../services/habitService";

const emptyStats: UserHabitStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  streakFreezes: 0,
};

export function useHabitInsights(userId: string) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserHabitStats>(emptyStats);
  const [heatmap, setHeatmap] = useState<{ date: string; count: number; minutes: number }[]>(
    [],
  );
  const [reflections, setReflections] = useState<
    {
      id: number;
      date: string;
      reflection_text: string;
      activity_type: string;
      verses_read: number;
    }[]
  >([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [nextHeatmap, nextReflections, streakData] = await Promise.all([
        db.getAllAsync<{ date: string; count: number; minutes: number }>(
          `
          SELECT date, COUNT(*) as count, SUM(minutes_spent) as minutes
          FROM quran_activity_logs
          WHERE user_id = ? AND date >= date('now', '-365 day')
          GROUP BY date
          ORDER BY date ASC
          `,
          [userId],
        ),
        db.getAllAsync<{
          id: number;
          date: string;
          reflection_text: string;
          activity_type: string;
          verses_read: number;
        }>(
          `
          SELECT
            id,
            date,
            note as reflection_text,
            activity_type,
            units_completed as verses_read
          FROM quran_activity_logs
          WHERE user_id = ? AND note IS NOT NULL AND TRIM(note) != ''
          ORDER BY date DESC, id DESC
          LIMIT 20
          `,
          [userId],
        ),
        db.getAllAsync<{ date: string }>(
          `
          SELECT DISTINCT date
          FROM quran_activity_logs
          WHERE user_id = ?
          ORDER BY date ASC
          `,
          [userId],
        ),
      ]);

      const activeDates = streakData.map((item) => item.date);
      let currentStreak = 0;
      let longestStreak = 0;
      let running = 0;
      let prevDate: Date | null = null;
      for (const date of activeDates) {
        const current = new Date(date);
        if (!prevDate) {
          running = 1;
        } else {
          const diff = Math.round((current.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
          running = diff === 1 ? running + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, running);
        prevDate = current;
      }

      const today = new Date().toISOString().slice(0, 10);
      let cursor = new Date(today);
      const dateSet = new Set(activeDates);
      while (dateSet.has(cursor.toISOString().slice(0, 10))) {
        currentStreak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }

      setStats({
        currentStreak,
        longestStreak,
        lastActiveDate: activeDates.length > 0 ? activeDates[activeDates.length - 1] : null,
        streakFreezes: 0,
      });
      setHeatmap(nextHeatmap);
      setReflections(nextReflections);
    } finally {
      setLoading(false);
    }
  }, [db, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, stats, heatmap, reflections, reload };
}
