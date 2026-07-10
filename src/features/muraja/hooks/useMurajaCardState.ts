import { useMemo } from "react";
import { useWeeklyMuraja } from "./useWeeklyMuraja";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { calculateTodayTask } from "../utils/murajaAnalytics";
import { IDailyMurajaLog } from "../types";
import { getSurahByPage } from "../utils/quranMapping";

export type MurajaCardState =
  | { type: 'LOADING' }
  | { type: 'NO_PLAN' }
  | { type: 'PLAN_FINISHED' }
  | { type: 'EVALUATION_DUE' }
  | { type: 'COMPLETED_TODAY'; log: IDailyMurajaLog; task: any }
  | { type: 'CATCHUP_DAY'; task: any }
  | { type: 'PLANNED_DAY'; task: any }
  | { type: 'REST_DAY' };

export const useMurajaCardState = (): MurajaCardState => {
  const { data, isLoading } = useWeeklyMuraja();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  return useMemo(() => {
    if (isLoading || surahLoading) return { type: 'LOADING' };
    if (!data) return { type: 'NO_PLAN' };

    if (data.planFinished) return { type: 'PLAN_FINISHED' };

    if (data.evaluationDue) return { type: 'EVALUATION_DUE' };

    const todayLog = data.todayLog;
    const loggedToday =
      todayLog?.status === 'completed' || todayLog?.status === 'partial';

    const activeDays = data.activeDays

    const todayTask = calculateTodayTask({
      today: new Date(),
      planStartDate: data.startDate ?? '',
      planEndDate: data.endDate ?? '',
      activeDays,
      plannedPagesPerDay: data.plannedPagesPerDay ?? 1,
      startPage: data.startPage ?? 1,
      endPage: data.endPage ?? 604,
      murajaLastPage: data.muraja_last_page ?? 0,
      dailyLogs: data.daily_logs,
      surahs: surah,    
      getSurahByPage, 
    });

    if (loggedToday && todayLog) {
      return { type: 'COMPLETED_TODAY', log: todayLog, task: todayTask };
    }

    if (todayTask?.isCatchup) {
      return { type: 'CATCHUP_DAY', task: todayTask };
    }

    if (todayTask && !todayTask.isVirtualTask) {
      return { type: 'PLANNED_DAY', task: todayTask };
    }

    return { type: 'REST_DAY' };
  }, [data, isLoading, surah, surahLoading]);
};