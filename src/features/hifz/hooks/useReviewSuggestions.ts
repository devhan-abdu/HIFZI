import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getSurahByPage } from "@/src/features/muraja/utils/quranMapping";
import { ReviewPriority } from "@/src/features/hifz/utils/reviewPriority";
import { PerformanceService, PagePerformance } from "@/src/services/PerformanceService";
import { getStateDb } from "@/src/lib/db/local-client";

export type ReviewSuggestion = {
  sourceLogId: number; 
  dueDate: string;
  cycleDay: number; 
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
  const { user } = useSession();
  const { items: surah } = useLoadSurahData();
  const userId = user?.id;
  const db = getStateDb()

  const query = useQuery({
    queryKey: ["hifz-review-suggestions-v2", userId, planId],
    enabled: !!userId,
    queryFn: async (): Promise<ReviewSuggestion[]> => {
      const duePages = await PerformanceService.getDuePages(db, 30);
      if (duePages.length === 0) return [];

      const today = new Date();
      const suggestions: ReviewSuggestion[] = [];
      const sortedPages = [...duePages].sort((a, b) => a.page_number - b.page_number);
      
      let currentRange: { start: number; end: number; performance: PagePerformance } | null = null;

      for (const page of sortedPages) {
        if (!currentRange) {
          currentRange = { start: page.page_number, end: page.page_number, performance: page };
        } else {
          const isConsecutive = page.page_number === currentRange.end + 1;
          const currentCount = currentRange.end - currentRange.start + 1;
          const isUnderLimit = currentCount < 5;
          
          const startSurah = surah.find(s => currentRange!.start >= s.startingPage && currentRange!.start <= s.endingPage);
          const currentSurah = surah.find(s => page.page_number >= s.startingPage && page.page_number <= s.endingPage);
          const isSameSurah = startSurah?.number === currentSurah?.number;

          if (isConsecutive && isUnderLimit && isSameSurah) {
            currentRange.end = page.page_number;
          } else {
            suggestions.push(formatRange(currentRange, today, surah));
            currentRange = { start: page.page_number, end: page.page_number, performance: page };
          }
        }
      }
      
      if (currentRange) {
        suggestions.push(formatRange(currentRange, today, surah));
      }

      return suggestions.slice(0, 2);
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
