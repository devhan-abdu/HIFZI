import { useMemo } from "react";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getTargetPage } from "../utils/getTargetPage";
import { getTodayTask } from "../utils/quran-logic";
import { hifzStatus } from "../utils/plan-status";
import { useGetHifzPlan } from "../hook/useGetHifzPlan";

export function useHifzDailyTask() {
  const { hifz, isLoading, error, refetch } = useGetHifzPlan();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  const analytics = useMemo(() => {
    if (!hifz || !surah.length) return null;
    return hifzStatus(hifz, surah);
  }, [hifz, surah]);

  const todayTask = useMemo(() => {
    if (!hifz || !analytics || !surah.length) return null;

    const today = new Date();
    const dayNumber = (today.getDay() + 6) % 7;
    const targetInfo = getTargetPage(
      hifz.selected_days,
      analytics.plannedPages,
      analytics.completedPages,
      hifz.pages_per_day,
      dayNumber,
    );

    const hasPlannedTarget = !!targetInfo && targetInfo.totalTarget > 0;
    const fallbackTarget = Math.max(1, Math.round(hifz.pages_per_day));
    const effectiveTarget = hasPlannedTarget ? targetInfo.totalTarget : fallbackTarget;
    const task = getTodayTask(hifz, surah, effectiveTarget);
    if (!task) return null;

    if (!hasPlannedTarget || !targetInfo) {
      return {
        ...task,
        target: fallbackTarget,
        totalTarget: fallbackTarget,
        baseTarget: fallbackTarget,
        catchUpAmount: 0,
        isPlannedDay: false,
        isCatchup: false,
        isVirtualTask: true,
      };
    }

    return {
      ...task,
      ...targetInfo,
      isCatchup: targetInfo.catchUpAmount > 0,
      isVirtualTask: false,
    };
  }, [hifz, surah, analytics]);

  return {
    hifz,
    todayTask,
    analytics,
    loading: isLoading || surahLoading,
    error,
    refetch,
  };
}
