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

    // Blocks all action cards until the user finishes the due evaluation.
    if (hifz.evaluationDue) return { type: 'EVALUATION_DUE' };

    const analytics = hifzStatus(hifz, surah);
    if (!analytics || hifz.pagesPerDay <= 0) return { type: 'REST_DAY' };

    const dayNumber = (new Date().getDay() + 6) % 7;
    const targetInfo = getTargetPage(
      hifz.selectedDays,
      analytics.plannedPages,
      hifz.pagesPerDay,
      dayNumber,
    );

    if (targetInfo.totalTarget <= 0) return { type: 'REST_DAY' };

    const rawTask = getTodayTask(hifz, surah, targetInfo.totalTarget);
    if (!rawTask) return { type: 'REST_DAY' };

    const todayTask = {
      ...rawTask,
      ...targetInfo,
      totalTarget: targetInfo.totalTarget,
      quotaEnd: rawTask.endPage,
    };

    const todayLog = hifz.todayLog;
    const loggedToday =
      todayLog?.status === 'completed' || todayLog?.status === 'partial';

    if (loggedToday && todayLog) {
      const loggedStart = todayLog.actualStartPage;
      const loggedEnd = todayLog.actualEndPage;
      const completed = todayLog.actualPagesCompleted ?? 0;
      const displayEnd = Math.max(todayTask.endPage, loggedEnd);
      const sSurah = surah.find(
        (s) => loggedStart >= s.startingPage && loggedStart <= s.endingPage,
      );
      const eSurah = surah.find(
        (s) => displayEnd >= s.startingPage && displayEnd <= s.endingPage,
      );
      const displaySurah =
        sSurah?.number === eSurah?.number
          ? sSurah?.englishName
          : `${sSurah?.englishName} & ${eSurah?.englishName}`;

      return {
        type: 'COMPLETED_TODAY',
        log: todayLog,
        task: {
          ...todayTask,
          startPage: loggedStart,
          endPage: displayEnd,
          quotaEnd: todayTask.endPage,
          totalTarget: todayTask.totalTarget,
          target: todayTask.totalTarget,
          completedPages: completed,
          displaySurah: displaySurah || todayTask.displaySurah || '',
          // Stay catchup-marked when still behind the plan after today's work.
          isCatchup: todayTask.isCatchup || todayTask.hasBacklog,
          isPlannedDay: todayTask.isPlannedDay,
        },
      };
    }

    // Behind plan → catchup on planned or rest days until backlog is cleared.
    if (todayTask.isCatchup || todayTask.hasBacklog) {
      return { type: 'CATCHUP_DAY', task: todayTask };
    }

    if (todayTask.isPlannedDay) {
      return { type: 'PLANNED_DAY', task: todayTask };
    }

    return { type: 'REST_DAY' };
  }, [hifz, isLoading, surah, surahLoading]);
};
