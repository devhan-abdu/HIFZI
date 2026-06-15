import { useMemo } from 'react';
import { useHifzPlan } from './useHifzPlan';
import { useLoadSurahData } from '@/src/hooks/useFetchQuran';
import { getTargetPage } from '../utils/getTargetPage';
import { getTodayTask } from '../utils/quran-logic';
import { hifzStatus } from '../utils/plan-status';

export type HifzCardState =
  | { type: 'LOADING' }
  | { type: 'NO_PLAN' }
  | { type: 'PLAN_FINISHED' }
  | { type: 'EVALUATION_DUE' }
  | { type: 'COMPLETED_TODAY'; log: any; task: any }
  | { type: 'CATCHUP_DAY'; task: any }
  | { type: 'PLANNED_DAY'; task: any }
  | { type: 'REST_DAY' };

export const useHifzCardState = (): HifzCardState => {
  const { hifz, isLoading } = useHifzPlan();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  return useMemo(() => {
    if (isLoading || surahLoading) return { type: 'LOADING' };
    if (!hifz) return { type: 'NO_PLAN' };

    if (hifz.planFinished) return { type: 'PLAN_FINISHED' };

    if (hifz.evaluationDue) return { type: 'EVALUATION_DUE' };

    const todayLog = hifz.todayLog;
    const loggedToday = todayLog?.status === 'completed' || todayLog?.status === 'partial';

    const analytics = hifzStatus(hifz, surah);
    if (!analytics || hifz.pagesPerDay <= 0) return { type: 'REST_DAY' };

    const dayNumber = (new Date().getDay() + 6) % 7;
    let targetInfo = getTargetPage(
      hifz.selectedDays,
      analytics.plannedPages,
      analytics.completedPages,
      hifz.pagesPerDay,
      dayNumber,
    );

    let isPlannedDay = hifz.selectedDays.includes(dayNumber);

    if (!isPlannedDay && targetInfo.catchUpAmount === 0 && hifz.selectedDays.length > 0) {
      let nextDay = (dayNumber + 1) % 7;
      let daysToAdd = 1;
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
      }
    }

    const effectiveTarget = targetInfo?.totalTarget > 0
      ? targetInfo.totalTarget
      : Math.max(0, Math.round(hifz.pagesPerDay));

    if (effectiveTarget <= 0) return { type: 'REST_DAY' };

    const rawTask = getTodayTask(hifz, surah, effectiveTarget);
    if (!rawTask) return { type: 'REST_DAY' };

    const todayTask = {
      ...rawTask,
      ...targetInfo,
      isCatchup: (targetInfo?.catchUpAmount ?? 0) > 0,
      isVirtualTask: !isPlannedDay,
    };

    if (loggedToday && todayLog) {
      return { type: 'COMPLETED_TODAY', log: todayLog, task: todayTask };
    }

    if (todayTask.isCatchup) {
      return { type: 'CATCHUP_DAY', task: todayTask };
    }

    if (!todayTask.isVirtualTask) {
      return { type: 'PLANNED_DAY', task: todayTask };
    }

    return { type: 'REST_DAY' };
  }, [hifz, isLoading, surah, surahLoading]);
};