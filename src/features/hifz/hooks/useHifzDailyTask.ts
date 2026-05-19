import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getTargetPage } from "../utils/getTargetPage";
import { getReinforcementRange, getTodayTask } from "../utils/quran-logic";
import { hifzStatus } from "../utils/plan-status";
import { useHifzPlan } from "./useHifzPlan";
import {
  isRetentionRangeDoneToday,
  useReviewSuggestions,
} from "./useReviewSuggestions";

export function useHifzDailyTask() {
  const { hifz, isLoading, error, refetch } = useHifzPlan();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  const analytics = useMemo(() => {
    if (!hifz || !surah.length) return null;
    return hifzStatus(hifz, surah);
  }, [hifz, surah]);

  const todayTask = useMemo(() => {
    if (!hifz || !analytics || !surah.length) return null;
    if (hifz.pagesPerDay <= 0) return null;

    const today = new Date();
    const evaluationDay = hifz.evaluationDay ?? 5;
    const normalizedToday = (today.getDay() + 6) % 7;
    if (normalizedToday === evaluationDay) {
      return null;
    }

    const dayNumber = (today.getDay() + 6) % 7;
    const targetInfo = getTargetPage(
      hifz.selectedDays,
      analytics.plannedPages,
      analytics.completedPages,
      hifz.pagesPerDay,
      dayNumber,
    );

    const hasPlannedTarget = !!targetInfo && targetInfo.totalTarget > 0;
    const fallbackTarget = Math.max(0, Math.round(hifz.pagesPerDay));
    if (fallbackTarget <= 0) return null;
    const effectiveTarget = hasPlannedTarget
      ? targetInfo.totalTarget
      : fallbackTarget;
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

  const { dailyReviews, suggestions: srsSuggestions } = useReviewSuggestions(
    hifz?.id,
  );

  const reinforcementTask = useMemo(() => {
    if (!hifz || !surah.length || !hifz.isReinforcementEnabled) return null;

    const today = new Date();
    const evaluationDay = hifz.evaluationDay ?? 5;
    const normalizedToday = (today.getDay() + 6) % 7;
    if (normalizedToday === evaluationDay) return null;

    return getReinforcementRange(hifz, surah, 5);
  }, [hifz, surah]);

  const { data: isReinforcementDone = false } = useQuery({
    queryKey: [
      "reinforcement-status",
      hifz?.userId,
      reinforcementTask?.startPage,
      reinforcementTask?.endPage,
    ],
    queryFn: async () => {
      if (!hifz?.userId || !reinforcementTask) return false;
      return isRetentionRangeDoneToday(
        hifz.userId,
        reinforcementTask.startPage,
        reinforcementTask.endPage,
        reinforcementTask.actualPages,
      );
    },
    enabled: !!hifz?.userId && !!reinforcementTask,
  });

  return {
    hifz,
    todayTask,
    reinforcementTask,
    isReinforcementDone,
    srsSuggestions,
    dailyReviews,
    analytics,
    isEvaluationDay: hifz
      ? (new Date().getDay() + 6) % 7 === (hifz.evaluationDay ?? 5)
      : false,
    loading: isLoading || surahLoading,
    error,
    refetch,
  };
}
