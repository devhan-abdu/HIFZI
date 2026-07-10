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
    const targetInfo = getTargetPage(
      hifz.selectedDays,
      analytics.plannedPages,
      analytics.completedPages,
      hifz.pagesPerDay,
      dayNumber,
    );

    if (loggedToday && todayLog) {
      const sSurah = surah.find((s) => todayLog.actualStartPage >= s.startingPage && todayLog.actualStartPage <= s.endingPage);
      const eSurah = surah.find((s) => todayLog.actualEndPage >= s.startingPage && todayLog.actualEndPage <= s.endingPage);
      const displaySurah = sSurah?.number === eSurah?.number
        ? sSurah?.englishName
        : `${sSurah?.englishName} & ${eSurah?.englishName}`;

      return {
        type: 'COMPLETED_TODAY',
        log: todayLog,
        task: {
          startPage: todayLog.actualStartPage,
          endPage: todayLog.actualEndPage,
          totalTarget: todayLog.actualPagesCompleted,
          displaySurah: displaySurah || '',
          isCatchup: false,
          isPlannedDay: true,
        },
      };
    }

    if (targetInfo.totalTarget <= 0) return { type: 'REST_DAY' };

    const rawTask = getTodayTask(hifz, surah, targetInfo.totalTarget);
    if (!rawTask) return { type: 'REST_DAY' };

    const todayTask = {
      ...rawTask,
      ...targetInfo,
    };

    if (todayTask.isCatchup) {
      return { type: 'CATCHUP_DAY', task: todayTask };
    }

    if (todayTask.isPlannedDay) {
      return { type: 'PLANNED_DAY', task: todayTask };
    }

    return { type: 'REST_DAY' };
  }, [hifz, isLoading, surah, surahLoading]);
};