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
    let targetInfo = getTargetPage(
      hifz.selectedDays,
      analytics.plannedPages,
      analytics.completedPages,
      hifz.pagesPerDay,
      dayNumber,
    );

    let isPlannedDay = hifz.selectedDays.includes(dayNumber);
    let isNextPlannedDay = false;

    // If today is not a planned day and there is NO catchup needed, look for the next planned day task
    if (!isPlannedDay && targetInfo.catchUpAmount === 0 && hifz.selectedDays.length > 0) {
      // Find the next planned day (from 1 to 7 days ahead)
      let daysToAdd = 1;
      let nextDay = (dayNumber + 1) % 7;
      while (!hifz.selectedDays.includes(nextDay) && daysToAdd < 7) {
        nextDay = (nextDay + 1) % 7;
        daysToAdd++;
      }
      if (hifz.selectedDays.includes(nextDay)) {
        targetInfo = getTargetPage(
          hifz.selectedDays,
          analytics.plannedPages,
          analytics.completedPages,
          hifz.pagesPerDay,
          nextDay,
        );
        isPlannedDay = true;
        isNextPlannedDay = true;
      }
    }

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
        isNextPlannedDay: false,
      };
    }

    return {
      ...task,
      ...targetInfo,
      isCatchup: targetInfo.catchUpAmount > 0,
      isVirtualTask: isNextPlannedDay ? true : !targetInfo.isPlannedDay,
      isNextPlannedDay,
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

  const isRestDay = useMemo(() => {
    if (!hifz) return false;
    const dayNumber = (new Date().getDay() + 6) % 7;
    const isPlannedToday = hifz.selectedDays.includes(dayNumber);
    // It's a rest day if it's not planned today and there's no catchup for today
    return !isPlannedToday && (!todayTask || !todayTask.isCatchup);
  }, [hifz, todayTask]);

  const hasTodayLog = useMemo(() => {
    if (!hifz?.hifzDailyLogs) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    const log = hifz.hifzDailyLogs.find((l) => l.date === todayStr);
    return !!log && (log.status === 'completed' || log.status === 'partial');
  }, [hifz]);

  return {
    hifz,
    todayTask,
    reinforcementTask,
    isReinforcementDone,
    srsSuggestions,
    dailyReviews,
    analytics,
    hasTodayLog,
    isEvaluationDay: hifz
      ? (new Date().getDay() + 6) % 7 === (hifz.evaluationDay ?? 5)
      : false,
    isRestDay,
    loading: isLoading || surahLoading,
    error,
    refetch,
  };
}
