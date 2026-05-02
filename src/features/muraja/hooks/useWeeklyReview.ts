import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { murajaService } from "../services/murajaService";
import { computeWeeklyReview, generateWeeklyProgress } from "../utils/murajaAnalytics";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getJuzByPage, getSurahByPage } from "../utils/quranMapping";

export const useWeeklyReview = (weekId?: number) => {
  const { user } = useSession();
  const { items: surah } = useLoadSurahData();

  const { data: rawPlan, isLoading, isError, refetch } = useQuery({
    queryKey: ["muraja-review", user?.id, weekId],
    queryFn: () => {
      if (!user?.id) return null;
      return murajaService.getReviewStats(user.id, weekId);
    },
    enabled: !!user?.id && !!surah,
  });

  const processed = useMemo(() => {
    if (!rawPlan || !surah) return null;

    const {
      weekStartDate: week_start_date,
      weekEndDate: week_end_date,
      estimatedTimeMin: estimated_time_min,
      startPage: start_page,
      endPage: end_page,
      plannedPagesPerDay: planned_pages_per_day,
      selectedDays,
      daily_logs,
      isActive,
      ...rest
    } = rawPlan;

    const start_surah = getSurahByPage(start_page ?? 1, surah) ?? "";
    const end_surah = getSurahByPage(end_page ?? 1, surah) ?? "";
    const start_juz = getJuzByPage(start_page ?? 1) ?? 0;
    const end_juz = getJuzByPage(end_page ?? 1) ?? 0;

    const activeDays = typeof selectedDays === "string" ? JSON.parse(selectedDays) : selectedDays;
    
    const progress = generateWeeklyProgress(
      week_start_date ?? "", 
      new Date().toISOString().slice(0, 10), 
      activeDays, 
      daily_logs
    );

    const plan = {
      ...rest,
      id: rawPlan.id,
      week_start_date,
      week_end_date,
      estimated_time_min,
      start_page,
      end_page,
      planned_pages: (planned_pages_per_day ?? 1) * (activeDays?.length || 1),
      start_surah,
      end_surah,
      start_juz,
      end_juz,
      status: isActive ? "active" : "completed",
      daily_logs,
      weekly_plan_days: progress as any, 
    };

    const analytics = computeWeeklyReview(plan);

    return { plan, analytics, progress };
  }, [rawPlan, surah]);

  return {
    plan: processed?.plan,
    analytics: processed?.analytics,
    progress: processed?.progress,
    isLoading,
    isError,
    refetch,
  };
};

