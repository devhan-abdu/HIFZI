import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHifzPlan } from './useHifzPlan';
import { useLoadSurahData } from '@/src/hooks/useFetchQuran';
import { hifzStatus, getHifzPaceDelta } from '../utils/plan-status';
import { getReinforcementRange } from '../utils/quran-logic';
import { isRetentionRangeDoneToday, useReviewSuggestions } from './useReviewSuggestions';

export const useHifzAnalytics = () => {
  const { hifz, isLoading } = useHifzPlan();
  const { items: surah, loading: surahLoading } = useLoadSurahData();

  const { dailyReviews, suggestions: srsSuggestions } = useReviewSuggestions(hifz?.id);

  const base = useMemo(() => {
    if (!hifz || !surah.length) return null;

    const analytics = hifzStatus(hifz, surah);
    if (!analytics) return null;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDay = (new Date().getDay() + 6) % 7;
    const isEvaluationDay = todayDay === (hifz.evaluationDay ?? 5);

    const reinforcementTask = hifz.isReinforcementEnabled && !isEvaluationDay
      ? getReinforcementRange(hifz, surah, 5)
      : null;

    const pace = getHifzPaceDelta(hifz, surah);

    const hasTodayLog = (() => {
      const log = hifz.hifzDailyLogs?.find(l => l.date === todayStr);
      return !!log && (log.status === 'completed' || log.status === 'partial');
    })();

    return {
      analytics,
      pace,
      reinforcementTask,
      hasTodayLog,
      isEvaluationDay,
      plan: hifz,
    };
  }, [hifz, surah]);

  const reinforcementTask = base?.reinforcementTask ?? null;
  const { data: isReinforcementDone = false } = useQuery({
    queryKey: [
      'reinforcement-status',
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

  if (!base) return { loading: isLoading || surahLoading };

  return {
    loading: false,
    analytics: base.analytics,
    pace: base.pace,
    reinforcementTask: base.reinforcementTask,
    isReinforcementDone,
    dailyReviews,
    srsSuggestions,
    hasTodayLog: base.hasTodayLog,
    isEvaluationDay: base.isEvaluationDay,
    plan: base.plan,
  };
};