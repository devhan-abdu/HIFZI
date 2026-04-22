import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getSurahByPage } from "@/src/features/muraja/utils/quranMapping";
import { ReviewPriority } from "@/src/features/hifz/utils/reviewPriority";
import { PerformanceService, PagePerformance } from "@/src/services/PerformanceService";

export type ReviewSuggestion = {
  sourceLogId: number; // For compatibility, will be 0 or page_number
  dueDate: string;
  cycleDay: number; // Mapped from stability
  startPage: number;
  endPage: number;
  startSurah: string;
  endSurah: string;
  priority: ReviewPriority;
  overdueDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateDiffDays(fromKey: string, toKey: string) {
  const from = new Date(fromKey).getTime();
  const to = new Date(toKey).getTime();
  return Math.floor((to - from) / DAY_MS);
}

function resolvePriority(overdueDays: number): ReviewPriority {
  if (overdueDays >= 3) return "high";
  if (overdueDays >= 1) return "medium";
  return "low";
}

export function useReviewSuggestions(planId?: number) {
  const db = useSQLiteContext();
  const { user } = useSession();
  const { items: surah } = useLoadSurahData();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["hifz-review-suggestions-v2", userId, planId],
    enabled: !!userId,
    queryFn: async (): Promise<ReviewSuggestion[]> => {
      const duePages = await PerformanceService.getDuePages(db, 30);
      if (duePages.length === 0) return [];

      const today = new Date();
      const suggestions: ReviewSuggestion[] = [];

      // Group consecutive pages into ranges
      let currentRange: { start: number; end: number; performance: PagePerformance } | null = null;

      for (const page of duePages) {
        if (!currentRange) {
          currentRange = { start: page.page_number, end: page.page_number, performance: page };
        } else if (page.page_number === currentRange.end + 1) {
          currentRange.end = page.page_number;
        } else {
          // Push previous range
          suggestions.push(formatRange(currentRange, today, surah));
          currentRange = { start: page.page_number, end: page.page_number, performance: page };
        }
      }
      if (currentRange) {
        suggestions.push(formatRange(currentRange, today, surah));
      }

      return suggestions.slice(0, 5);
    },
  });

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

function formatRange(
  range: { start: number; end: number; performance: PagePerformance },
  today: Date,
  surah: any[]
): ReviewSuggestion {
  const overdueDays = Math.max(0, dateDiffDays(range.performance.next_review_at!, today.toISOString()));
  return {
    sourceLogId: range.start,
    dueDate: range.performance.next_review_at!,
    cycleDay: Math.round(range.performance.stability),
    startPage: range.start,
    endPage: range.end,
    startSurah: getSurahByPage(range.start, surah) ?? "Unknown",
    endSurah: getSurahByPage(range.end, surah) ?? "Unknown",
    priority: resolvePriority(overdueDays),
    overdueDays,
  };
}
