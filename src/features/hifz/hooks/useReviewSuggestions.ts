import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useHifzPlan } from "./useHifzPlan";
import { getSurahByPage } from "@/src/features/muraja/utils/quranMapping";
import { ISurah } from "@/src/types";
import { ReviewPriority } from "@/src/features/hifz/utils/reviewPriority";
import { PerformanceService, PagePerformance } from "@/src/services/PerformanceService";
import { getHifzMemorizedRange } from "@/src/features/hifz/utils/hifz-page-range";
import { db } from "@/src/lib/db/local-client";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { and, eq } from "drizzle-orm";

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

export type DailyReviewItem = ReviewSuggestion & {
  isCompleted: boolean;
  slotId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_SLOT_COUNT = 2;
const RETENTION_LOCAL_LOG_ID = -1;

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

function dailyPicksKey(userId: string, planId: number, dateKey: string) {
  return `hifz_daily_reviews_${userId}_${planId}_${dateKey}`;
}

async function getTodayRetentionPageIds(userId: string): Promise<Set<number>> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const logs = await db.query.pageActivityLogs.findMany({
    where: and(
      eq(pageActivityLogs.userId, userId),
      eq(pageActivityLogs.logDate, todayStr),
      eq(pageActivityLogs.localLogId, RETENTION_LOCAL_LOG_ID),
    ),
  });
  return new Set(logs.map((log) => log.pageId));
}

function getTargetPages(
  startPage: number,
  endPage: number,
  explicitPages?: number[],
): number[] {
  if (explicitPages && explicitPages.length > 0) {
    return explicitPages;
  }
  return Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  );
}

function isRangeCompletedToday(
  startPage: number,
  endPage: number,
  completedPages: Set<number>,
  explicitPages?: number[],
): boolean {
  if (completedPages.size === 0) return false;
  const targetPages = getTargetPages(startPage, endPage, explicitPages);
  return targetPages.every((page) => completedPages.has(page));
}

function formatRange(
  range: { start: number; end: number; performance: PagePerformance },
  today: Date,
  surah: ISurah[],
): ReviewSuggestion {
  const overdueDays = Math.max(
    0,
    dateDiffDays(range.performance.next_review_at!, today.toISOString()),
  );
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

function buildSuggestionsFromDuePages(
  duePages: PagePerformance[],
  today: Date,
  surah: ISurah[],
): ReviewSuggestion[] {
  const suggestions: ReviewSuggestion[] = [];
  const sortedPages = [...duePages].sort(
    (a, b) => a.page_number - b.page_number,
  );

  let currentRange: {
    start: number;
    end: number;
    performance: PagePerformance;
  } | null = null;

  for (const page of sortedPages) {
    if (!currentRange) {
      currentRange = {
        start: page.page_number,
        end: page.page_number,
        performance: page,
      };
    } else {
      const isConsecutive = page.page_number === currentRange.end + 1;
      const currentCount = currentRange.end - currentRange.start + 1;
      const isUnderLimit = currentCount < 5;

      const startSurah = surah.find(
        (s) =>
          currentRange!.start >= s.startingPage &&
          currentRange!.start <= s.endingPage,
      );
      const currentSurah = surah.find(
        (s) =>
          page.page_number >= s.startingPage &&
          page.page_number <= s.endingPage,
      );
      const isSameSurah = startSurah?.number === currentSurah?.number;

      if (isConsecutive && isUnderLimit && isSameSurah) {
        currentRange.end = page.page_number;
      } else {
        suggestions.push(formatRange(currentRange, today, surah));
        currentRange = {
          start: page.page_number,
          end: page.page_number,
          performance: page,
        };
      }
    }
  }

  if (currentRange) {
    suggestions.push(formatRange(currentRange, today, surah));
  }

  return suggestions;
}

export function useReviewSuggestions(planId?: number) {
  const { user } = useSession();
  const { hifz } = useHifzPlan();
  const { items: surah } = useLoadSurahData();
  const userId = user?.id;
  const todayKey = new Date().toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: ["hifz-review-suggestions-v2", userId, planId, todayKey],
    enabled: !!userId && !!planId && !!hifz && surah.length > 0,
    queryFn: async (): Promise<DailyReviewItem[]> => {
      const hifzRange = getHifzMemorizedRange(hifz!);
      const duePages = await PerformanceService.getDuePages(
        db,
        userId!,
        30,
        hifzRange,
      );

      const today = new Date();
      const freshSuggestions = buildSuggestionsFromDuePages(
        duePages,
        today,
        surah,
      );

      const storageKey = dailyPicksKey(userId!, planId!, todayKey);
      const cachedRaw = await AsyncStorage.getItem(storageKey);
      let dailyPicks: ReviewSuggestion[] = cachedRaw
        ? JSON.parse(cachedRaw)
        : [];

      if (dailyPicks.length === 0 && freshSuggestions.length > 0) {
        dailyPicks = freshSuggestions.slice(0, DAILY_SLOT_COUNT);
        await AsyncStorage.setItem(storageKey, JSON.stringify(dailyPicks));
      } else if (dailyPicks.length < DAILY_SLOT_COUNT) {
        const existingKeys = new Set(
          dailyPicks.map((p) => `${p.startPage}-${p.endPage}`),
        );
        for (const suggestion of freshSuggestions) {
          if (dailyPicks.length >= DAILY_SLOT_COUNT) break;
          const key = `${suggestion.startPage}-${suggestion.endPage}`;
          if (!existingKeys.has(key)) {
            dailyPicks.push(suggestion);
            existingKeys.add(key);
          }
        }
        await AsyncStorage.setItem(storageKey, JSON.stringify(dailyPicks));
      }

      const completedPages = await getTodayRetentionPageIds(userId!);

      return dailyPicks.slice(0, DAILY_SLOT_COUNT).map((pick) => ({
        ...pick,
        slotId: `${pick.startPage}-${pick.endPage}`,
        isCompleted: isRangeCompletedToday(
          pick.startPage,
          pick.endPage,
          completedPages,
        ),
      }));
    },
  });

  return {
    dailyReviews: query.data ?? [],
    suggestions: query.data?.filter((item) => !item.isCompleted) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Check if a page range was reviewed today via retention logging. */
export async function isRetentionRangeDoneToday(
  userId: string,
  startPage: number,
  endPage: number,
  explicitPages?: number[],
): Promise<boolean> {
  const completedPages = await getTodayRetentionPageIds(userId);
  return isRangeCompletedToday(
    startPage,
    endPage,
    completedPages,
    explicitPages,
  );
}
