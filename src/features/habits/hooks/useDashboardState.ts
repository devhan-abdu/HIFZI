import { useSession } from "@/src/hooks/useSession";
import { usePlanLifecycle } from "./usePlanLifecycle";
import { useWeeklyEvaluationTrigger } from "./useWeeklyEvaluationTrigger";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";

export type DashboardStateValue =
  | { type: 'LOADING' }
  | { type: 'NO_ACTIVE_PLAN' }
  | { type: 'EVALUATION_DUE'; duePlanIds: number[] }
  | { type: 'PLAN_FINISHED'; planId: number }
  | { type: 'TODAY_TASK'; task: any }
  | { type: 'REST_DAY'; nextTaskDate?: string };

export function useDashboardState(
  type: 'HIFZ' | 'MURAJA',
  plan: any,
  todayTask: any,
  isRestDay: boolean,
  baseLoading: boolean,
  baseRefetch: () => Promise<any>
) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { duePlans, duePlanIds, isLoading: loadingEval } = useWeeklyEvaluationTrigger();
  const { getPlanState, isLoading: loadingLifecycle } = usePlanLifecycle();

  const planState = useMemo(() => {
    return getPlanState(plan?.id, type);
  }, [getPlanState, plan?.id, type]);

  const dashboardState = useMemo((): DashboardStateValue => {
    if (baseLoading || loadingEval || loadingLifecycle) {
      return { type: 'LOADING' };
    }

    if (!plan) {
      return { type: 'NO_ACTIVE_PLAN' };
    }

    const evalDueForType = duePlans.some((p) => p.activityType === type);
    if (planState === "EVALUATION_DUE" || evalDueForType) {
      return {
        type: "EVALUATION_DUE",
        duePlanIds: duePlans
          .filter((p) => p.activityType === type)
          .map((p) => p.localRefId)
          .filter((id): id is number => id != null),
      };
    }

    if (planState === 'COMPLETION_DUE') {
      return { type: 'PLAN_FINISHED', planId: plan.id };
    }

    if (todayTask) {
      return { type: 'TODAY_TASK', task: todayTask };
    }

    return { type: 'REST_DAY' };
  }, [plan, planState, todayTask, isRestDay, baseLoading, loadingEval, loadingLifecycle, duePlans]);

  const refetchAll = useCallback(async () => {
    if (user?.id) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['weekly-evaluation-due', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['finished-plans', user.id] }),
      ]);
    }
    await baseRefetch();
  }, [user?.id, baseRefetch, queryClient]);

  return {
    state: dashboardState,
    refetchAll,
    isLoading: baseLoading || loadingEval || loadingLifecycle,
  };
}
