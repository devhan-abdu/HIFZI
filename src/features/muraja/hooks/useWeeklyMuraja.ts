import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import {
  formatJuzRange,
  getJuzByPage,
  getPagePositionLabel,
  getSurahByPage,
} from "../utils/quranMapping";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { murajaService } from "../services/murajaService";
import {
    generateRolling7DayWindow,
    getPerformanceStatus,
    calculateTodayTask,
    getLocalDateString,
} from "../utils/murajaAnalytics";

export const useWeeklyMuraja = () => {
    const { user } = useSession();
    const { items: surah, loading: surahLoading } = useLoadSurahData();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["muraja-dashboard", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const result = await murajaService.getDashboardState(user.id);
            return result ?? null;
        },
        enabled: !!user?.id,
        staleTime: 30_000,
    });

    const processedData = useMemo(() => {
        if (!data || !surah) return null;

        const {
            id,
            daily_logs,
            all_logs,
            selectedDays: selected_days,
            startPage: start_page,
            endPage: end_page,
            plannedPagesPerDay: planned_pages_per_day,
            muraja_last_page,
            muraja_current_streak,
            weekStartDate: week_start_date,
            weekEndDate: week_end_date,
            estimatedTimeMin: estimated_time_min,
            evaluationDay: rawEvalDay,
        } = data;

        const today = new Date();
        const todayStr = getLocalDateString(today);
        const evaluationDay = (rawEvalDay as number | undefined) ?? 5;
        const normalizedTodayDay = (today.getDay() + 6) % 7;
        const isEvaluationDay = normalizedTodayDay === evaluationDay;

        const activeDays =
            typeof selected_days === "string"
                ? (JSON.parse(selected_days) as number[])
                : (selected_days as unknown as number[]);

        // ── Plan metadata ────────────────────────────────────────────────────
        const totalRangePages = (end_page ?? 1) - (start_page ?? 1) + 1;
        const start_juz = getJuzByPage(start_page ?? 1) ?? 0;
        const end_juz = getJuzByPage(end_page ?? 1) ?? 0;
        const startSurah = getSurahByPage(start_page ?? 1, surah) ?? "";
        const endSurah = getSurahByPage(end_page ?? 1, surah) ?? "";

        // ── Stats (range-scoped) ─────────────────────────────────────────────
        const totalCompletedPages = daily_logs.reduce(
            (acc: number, curr: any) => acc + (curr.completed_pages ?? 0),
            0,
        );

        // Overall progress based on murajaLastPage position in the range
        const safeLastPage = Math.max(muraja_last_page ?? 0, (start_page ?? 1) - 1);
        const overAllProgress = totalRangePages > 0
            ? (((safeLastPage - (start_page ?? 1) + 1) / totalRangePages) * 100).toFixed(1)
            : "0.0";

        // Missed pages count for performance status
        const missedDaysCount = daily_logs.filter(
            (l: any) => l.status === "missed" || (l.status === "pending" && l.date < todayStr),
        ).length;

        const performanceStatus = getPerformanceStatus(totalCompletedPages - (activeDays.length * (planned_pages_per_day ?? 1)));

        // ── Today's Task (range-based, with catch-up) ────────────────────────
        const todayTask = isEvaluationDay
            ? null
            : calculateTodayTask({
                today,
                planStartDate: week_start_date ?? "",
                planEndDate: week_end_date ?? "",
                activeDays,
                plannedPagesPerDay: planned_pages_per_day ?? 1,
                startPage: start_page ?? 1,
                endPage: end_page ?? 604,
                murajaLastPage: muraja_last_page ?? 0,
                dailyLogs: daily_logs,
                surahs: surah,
                getSurahByPage,
            });

        const currentPage = Math.max(
            muraja_last_page ?? 0,
            (start_page ?? 1) - 1,
        );
        const displayPage = Math.max(currentPage, start_page ?? 1);
        const pagePosition = getPagePositionLabel(displayPage, surah);
        const currentSurahAt = pagePosition.surahName;
        const currentJuz = getJuzByPage(displayPage);
        const juzRangeLabel = formatJuzRange(start_juz, end_juz);

        // ── Rolling 7-day window for DayByDay ───────────────────────────────
        const dayProgress = generateRolling7DayWindow(
            week_start_date ?? "",
            week_end_date ?? "",
            activeDays,
            daily_logs,
            today,
        );

        // ── Is true rest day (not scheduled AND no missed pages) ─────────────
        const isScheduledToday = activeDays.includes(normalizedTodayDay);
        const hasMissedPages = (todayTask?.missedPages ?? 0) > 0;
        const isRestDay = !isEvaluationDay && !isScheduledToday && !hasMissedPages;

        // ── Plan overview (range-based) ──────────────────────────────────────
        const planOverview = {
            id,
            totalRangePages,
            plannedDays: activeDays.length,
            startDate: week_start_date,
            endDate: week_end_date,
            estimated_time_min,
            planned_pages_per_day,
            start_juz,
            end_juz,
            startSurah,
            endSurah,
            startPage: start_page,
            endPage: end_page,
            // Backward-compat aliases still used by WeeklyOverviewCard / TodayTask.tsx
            weeklyTargetPages: totalRangePages,
            totalDays: activeDays.length,
            week_start_date,
            week_end_date,
        };

        return {
            planOverview,
            // Backward compat: weeklyPlan still available for components not yet updated
            weeklyPlan: planOverview,
            stats: {
                totalCompletedPages,
                totalRangePages,
                performanceStatus,
                streak: muraja_current_streak,
                overAllProgress,
                isEvaluationDay,
                missedDaysCount,
                currentPage: displayPage,
                currentSurah: currentSurahAt,
                currentJuz,
                pageInSurah: pagePosition.pageInSurah,
                juzRangeLabel,
            },
            todayTask,
            dayProgress,
            weekProgress: dayProgress, // backward compat alias
            isRestDay,
            hasMissedPages,
        };
    }, [data, surah]);

    return {
        ...processedData,
        loading: isLoading || surahLoading || (!surah.length && !isError),
        error: isError,
        refetch,
    };
};

// Alias for new code
export const useMurajaDashboard = useWeeklyMuraja;
