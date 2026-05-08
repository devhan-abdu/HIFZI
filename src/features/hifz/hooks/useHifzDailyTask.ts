import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { getTargetPage } from "../utils/getTargetPage";
import { getTodayTask } from "../utils/quran-logic";
import { hifzStatus } from "../utils/plan-status";
import { useHifzPlan } from "./useHifzPlan";
import { getReinforcementRange } from "../utils/quran-logic";
import { useReviewSuggestions } from "./useReviewSuggestions";

export function useHifzDailyTask() {
  const { hifz, isLoading, error, refetch } = useHifzPlan();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  const analytics = useMemo(() => {
    if (!hifz || !surah.length) return null;
    return hifzStatus(hifz, surah);
  }, [hifz, surah]);

  const todayTask = useMemo(() => {
    if (!hifz || !analytics || !surah.length) return null;
    
    const today = new Date();
    const evaluationDay = hifz.evaluationDay ?? 5;
    if (today.getDay() === evaluationDay) {
        return null; // No task on evaluation day
    }

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

  const { suggestions: srsSuggestions } = useReviewSuggestions(hifz?.id);

  const reinforcementTask = useMemo(() => {
    if (!hifz || !surah.length || !hifz.is_reinforcement_enabled) return null;
    
    const today = new Date();
    const evaluationDay = hifz.evaluationDay ?? 5;
    if (today.getDay() === evaluationDay) return null;

    return getReinforcementRange(hifz, surah, 5);
  }, [hifz, surah]);

  const { data: murajaLogs = [] } = useQuery({
    queryKey: ['today-muraja-logs', hifz?.user_id],
    queryFn: async () => {
      if (!hifz?.user_id) return [];
      const { db } = await import("@/src/lib/db/local-client");
      const { pageActivityLogs } = await import("@/src/features/habits/database/habitSchema");
      const { and, gte, eq } = await import("drizzle-orm");
      
      const todayStr = new Date().toISOString().slice(0, 10);
      return await db.query.pageActivityLogs.findMany({
        where: and(
          eq(pageActivityLogs.userId, hifz.user_id),
          eq(pageActivityLogs.source, 'muraja'),
          gte(pageActivityLogs.logDate, todayStr)
        )
      });
    },
    enabled: !!hifz?.user_id
  });

  const completedReviews = useMemo(() => {
    if (!murajaLogs.length || !surah.length) return [];
    
    // Simple grouping of consecutive pages into ranges
    const sorted = [...murajaLogs].sort((a, b) => a.pageId - b.pageId);
    const groups: any[] = [];
    let current: any = null;

    const { getSurahByPage } = require("@/src/features/muraja/utils/quranMapping");

    for (const log of sorted) {
      if (!current || log.pageId !== current.endPage + 1) {
        current = {
          startPage: log.pageId,
          endPage: log.pageId,
          startSurah: getSurahByPage(log.pageId, surah),
          endSurah: getSurahByPage(log.pageId, surah),
          isCompleted: true
        };
        groups.push(current);
      } else {
        current.endPage = log.pageId;
        current.endSurah = getSurahByPage(log.pageId, surah);
      }
    }
    return groups;
  }, [murajaLogs, surah]);

  const isReinforcementDone = useMemo(() => {
    if (!reinforcementTask || !murajaLogs.length) return false;
    return murajaLogs.some(log => 
      log.pageId >= reinforcementTask.startPage && 
      log.pageId <= reinforcementTask.endPage
    );
  }, [reinforcementTask, murajaLogs]);

  return {
    hifz,
    todayTask,
    reinforcementTask,
    isReinforcementDone: !!isReinforcementDone,
    srsSuggestions,
    completedReviews,
    analytics,
    isEvaluationDay: hifz ? new Date().getDay() === (hifz.evaluationDay ?? 5) : false,
    loading: isLoading || surahLoading,
    error,
    refetch,
  };
}
