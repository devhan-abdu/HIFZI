import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useSession } from "@/src/hooks/useSession";
import {
  createInitialReviewSchedule,
  getNextReviewSchedule,
  ReviewScheduleState,
} from "@/src/features/hifz/services/reviewScheduler";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getSurahByPage } from "@/src/features/muraja/utils/quranMapping";
import { ReviewPriority } from "@/src/features/hifz/utils/reviewPriority";

type HifzLogRow = {
  id: number;
  hifz_plan_id: number;
  actual_start_page: number;
  actual_end_page: number;
  actual_pages_completed: number;
  status: "completed" | "partial" | "missed";
  date: string;
};

export type ReviewSuggestion = {
  sourceLogId: number;
  dueDate: string;
  cycleDay: 1 | 2 | 3;
  startPage: number;
  endPage: number;
  startSurah: string;
  endSurah: string;
  priority: ReviewPriority;
  overdueDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function dateDiffDays(fromKey: string, toKey: string) {
  const from = fromDateKey(fromKey).getTime();
  const to = fromDateKey(toKey).getTime();
  return Math.floor((to - from) / DAY_MS);
}

function resolvePriority(overdueDays: number): ReviewPriority {
  if (overdueDays >= 3) return "high";
  if (overdueDays >= 1) return "medium";
  return "low";
}

function overlapsRange(left: HifzLogRow, right: HifzLogRow) {
  const leftStart = Math.min(left.actual_start_page, left.actual_end_page);
  const leftEnd = Math.max(left.actual_start_page, left.actual_end_page);
  const rightStart = Math.min(right.actual_start_page, right.actual_end_page);
  const rightEnd = Math.max(right.actual_start_page, right.actual_end_page);
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function useReviewSuggestions(planId?: number) {
  const db = useSQLiteContext();
  const { user } = useSession();
  const { items: surah } = useLoadSurahData();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["hifz-review-suggestions", userId, planId],
    enabled: !!userId && !!planId,
    queryFn: async (): Promise<ReviewSuggestion[]> => {
      if (!userId || !planId) return [];
      const todayKey = toDateKey(new Date());
      const logs = await db.getAllAsync<HifzLogRow>(
        `
          SELECT id, hifz_plan_id, actual_start_page, actual_end_page, actual_pages_completed, status, date
          FROM hifz_logs_local
          WHERE user_id = ? AND hifz_plan_id = ?
          ORDER BY date ASC, id ASC
        `,
        [userId, planId],
      );

      const seeds = logs.filter(
        (row) => row.status !== "missed" && (row.actual_pages_completed ?? 0) > 0,
      );

      const dueSuggestions: ReviewSuggestion[] = [];
      for (const seed of seeds) {
        let schedule: ReviewScheduleState = createInitialReviewSchedule(seed.date);
        let cycle: 1 | 2 | 3 = 1;

        while (cycle <= 3 && schedule.nextReviewDate <= todayKey) {
          const completion = logs.find(
            (candidate) =>
              candidate.date >= schedule.nextReviewDate &&
              candidate.status !== "missed" &&
              overlapsRange(seed, candidate),
          );

          if (completion) {
            schedule = getNextReviewSchedule(schedule, "completed", completion.date);
            cycle = schedule.cycleDay;
            continue;
          }

          const missed = logs.find(
            (candidate) =>
              candidate.date === schedule.nextReviewDate &&
              candidate.status === "missed" &&
              overlapsRange(seed, candidate),
          );
          if (missed) {
            schedule = getNextReviewSchedule(schedule, "missed", missed.date);
            cycle = schedule.cycleDay;
            continue;
          }

          const overdueDays = Math.max(0, dateDiffDays(schedule.nextReviewDate, todayKey));
          dueSuggestions.push({
            sourceLogId: seed.id,
            dueDate: schedule.nextReviewDate,
            cycleDay: cycle,
            startPage: seed.actual_start_page,
            endPage: seed.actual_end_page,
            startSurah: getSurahByPage(seed.actual_start_page, surah) ?? "Unknown",
            endSurah: getSurahByPage(seed.actual_end_page, surah) ?? "Unknown",
            priority: resolvePriority(overdueDays),
            overdueDays,
          });
          break;
        }
      }

      const deduped = new Map<string, ReviewSuggestion>();
      for (const item of dueSuggestions) {
        const key = `${item.startPage}-${item.endPage}-${item.cycleDay}`;
        const existing = deduped.get(key);
        if (!existing || item.overdueDays > existing.overdueDays) {
          deduped.set(key, item);
        }
      }

      return Array.from(deduped.values())
        .sort((left, right) => {
          if (right.overdueDays !== left.overdueDays) {
            return right.overdueDays - left.overdueDays;
          }
          return left.dueDate.localeCompare(right.dueDate);
        })
        .slice(0, 5);
    },
  });

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
