import { useMemo } from "react";
import { useWeeklyMuraja } from "./useWeeklyMuraja";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import {
  formatJuzRange,
  getJuzByPage,
  getPagePositionLabel,
  getSurahByPage,
} from "../utils/quranMapping";
import {
  generateRolling7DayWindow,
  getPerformanceStatus,
  calculateExpectedPages,
  getLocalDateString,
} from "../utils/murajaAnalytics";

function computeMissedDays(
  planStartDateStr: string,
  activeDays: number[],
  dailyLogs: any[],
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getLocalDateString(today);
  const planStart = new Date(planStartDateStr);
  planStart.setHours(0, 0, 0, 0);

  let missed = 0;
  const cursor = new Date(planStart);
  while (cursor < today) {
    const dateStr = getLocalDateString(cursor);
    const isScheduled = activeDays.includes((cursor.getDay() + 6) % 7);
    if (isScheduled) {
      const log = dailyLogs.find((l: any) => l.date === dateStr);
      const wasSuccess = log && (log.status === 'completed' || log.status === 'partial');
      if (!wasSuccess) missed++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return missed;
}

export const useMurajaAnalytics = () => {
  const { data, isLoading } = useWeeklyMuraja();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  return useMemo(() => {
    if (!data || !surah?.length) return { loading: isLoading || surahLoading };

    const todayStr = getLocalDateString(new Date());
    const today = new Date();

    const activeDays = data.activeDays;

    const start_page = data.startPage ?? 1;
    const end_page   = data.endPage ?? 604;
    const planned_pages_per_day = data.plannedPagesPerDay ?? 1;

    const totalRangePages = end_page - start_page + 1;
    const start_juz = getJuzByPage(start_page) ?? 0;
    const end_juz   = getJuzByPage(end_page) ?? 0;
    const startSurah = getSurahByPage(start_page, surah) ?? '';
    const endSurah   = getSurahByPage(end_page, surah) ?? '';

    const totalCompletedPages = data.daily_logs.reduce(
      (acc, l) => acc + (l.completed_pages ?? 0), 0
    );

    const missedDaysCount = computeMissedDays(
      data.startDate  ?? todayStr,
      activeDays,
      data.daily_logs,
    );

    const totalMissedPages = missedDaysCount * planned_pages_per_day;
    const accuracy =
      (totalCompletedPages + totalMissedPages) === 0
        ? 100
        : Math.min(
            Math.round((totalCompletedPages / (totalCompletedPages + totalMissedPages)) * 100),
            100
          );

    const safeLastPage = Math.max(data.muraja_last_page ?? 0, start_page - 1);
    const overAllProgress =
      totalRangePages > 0
        ? (((safeLastPage - start_page + 1) / totalRangePages) * 100).toFixed(1)
        : '0.0';

    const expectedPages = calculateExpectedPages(
      data.startDate ?? '',
      activeDays,
      planned_pages_per_day,
      today
    );
    const performanceStatus = getPerformanceStatus(totalCompletedPages - expectedPages);

    const displayPage = Math.max(data.muraja_last_page ?? 0, start_page);
    const pagePosition = getPagePositionLabel(displayPage, surah);
    const juzRangeLabel = formatJuzRange(start_juz, end_juz);

    const dayProgress = generateRolling7DayWindow(
      data.startDate ?? '',
      data.endDate ?? '',
      activeDays,
      data.daily_logs,
      today
    );

    const planOverview = {
      id: data.id,
      totalRangePages,
      plannedDays: activeDays.length,
      startDate: data.startDate ,
      endDate: data.endDate,
      estimated_time_min: data.estimatedTimeMin,
      planned_pages_per_day,
      start_juz,
      end_juz,
      startSurah,
      endSurah,
      startPage: start_page,
      endPage: end_page,
      weeklyTargetPages: totalRangePages,
      totalDays: activeDays.length,
      week_start_date: data.startDate,
      week_end_date: data.endDate ,
    };

    return {
      loading: false,
      planOverview,
      weeklyPlan: planOverview,
      stats: {
        totalCompletedPages,
        totalRangePages,
        performanceStatus,
        accuracy,
        streak: data.muraja_current_streak,
        overAllProgress,
        missedDaysCount,
        currentPage: displayPage,
        currentSurah: pagePosition.surahName,
        currentJuz: getJuzByPage(displayPage),
        pageInSurah: pagePosition.pageInSurah,
        juzRangeLabel,
      },
      dayProgress,
      weekProgress: dayProgress,
      today_extra_sessions: data.today_extra_sessions ?? [],
    };
  }, [data, surah, isLoading, surahLoading]);
};