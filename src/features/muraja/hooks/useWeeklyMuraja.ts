import {  useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { getJuzByPage, getSurahByPage } from "../utils/quranMapping";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { murajaService } from "../services/murajaService";
import { calculateExpectedPages, generateWeeklyProgress, getPerformanceStatus } from "../utils/murajaAnalytics";


export const useWeeklyMuraja = () => {
   const { user } = useSession();
    const { items: surah } = useLoadSurahData();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["muraja-dashboard", user?.id],
         queryFn: async () => {
        if (!user?.id) return null;
        void murajaService.syncPending(user.id);
        const result = await murajaService.getDashboardState(user.id);
        return result ?? null; 
        },
        enabled: !!user?.id && !!surah,
    });

   
    const processedData = useMemo(() => {
        if (!data || !surah) return null;

        const {
            id, daily_logs, 
            selectedDays: selected_days, 
            startPage: start_page, 
            endPage: end_page,
            plannedPagesPerDay: planned_pages_per_day, 
            muraja_last_page, 
            muraja_current_streak,
            weekStartDate: week_start_date, 
            weekEndDate: week_end_date, 
            estimatedTimeMin: estimated_time_min,
        } = data;

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const activeDays = typeof selected_days === "string" ? JSON.parse(selected_days) as number[] : selected_days as unknown as number[];

        const expectedPages = calculateExpectedPages(
            week_start_date ?? "", week_end_date ?? "", today, activeDays, planned_pages_per_day ?? 1
        );
        const totalCompletedPages = daily_logs.reduce((acc: number, curr: any) => acc + (curr.completed_pages ?? 0), 0);
        const pageDiff = totalCompletedPages - expectedPages;
        const performanceStatus = getPerformanceStatus(pageDiff);

        const isScheduledToday = activeDays.includes(today.getDay());
        const todayLog = daily_logs.find((log: any) => log.date === todayStr);
        const isPlanActiveNow = today >= new Date(week_start_date ?? "") && today <= new Date(week_end_date ?? "");

        let todayTask = null;
        if (isPlanActiveNow) {
            const safeStartPage = start_page ?? 1;
            const fallbackStart = Math.max(safeStartPage, (muraja_last_page ?? safeStartPage - 1) + 1);
            const start = todayLog?.start_page ?? fallbackStart;
            const completed = todayLog?.completed_pages ?? 0;
            const end = todayLog
                    ? completed > 0
                        ? start + completed - 1
                        : start
                    : start + (planned_pages_per_day ?? 1) - 1;

           todayTask = {
            isCompleted: todayLog?.status === "completed",
            isCatchup: !isScheduledToday && pageDiff < 0,
            status: todayLog ? todayLog.status : "pending",
            startPage: start,
            endPage: end,
            completedPages: completed,
            startSurah: getSurahByPage(start, surah),
            endSurah: getSurahByPage(end, surah),
            isVirtualTask: !isScheduledToday && !todayLog,
        };
        }

        const start_juz = getJuzByPage(start_page ?? 1) ?? 0; 
        const end_juz = getJuzByPage(end_page ?? 1) ?? 0;
        const startSurah = getSurahByPage(start_page ?? 1, surah) ?? ""; 
        const endSurah = getSurahByPage(end_page ?? 1, surah) ?? "";

        return {
            weeklyPlan: {
                id, 
                totalPage: (planned_pages_per_day ?? 1) * activeDays.length,
                totalDays: activeDays.length,
                week_start_date,
                week_end_date,
                estimated_time_min,
                planned_pages_per_day,
                start_juz,
                end_juz,
                startSurah,
                endSurah

            },
            stats: {
                totalCompletedPages,
                pageDiff,
                performanceStatus,
                streak: muraja_current_streak,
                overAllProgress: ((totalCompletedPages / ((end_page ?? 1) - (start_page ?? 1) + 1)) * 100).toFixed(1)
            },
            todayTask,
            weekProgress: generateWeeklyProgress(week_start_date ?? "", todayStr, activeDays, daily_logs)
        };
    }, [data, surah]);
  

    return {
       ...processedData,
        loading: isLoading,
        error: isError,
        refetch
    };
};
