import { useSession } from "@/src/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { planLifecycleService } from "../services/planLifecycleService";
import { useWeeklyEvaluationTrigger } from "./useWeeklyEvaluationTrigger";
import { useMemo } from "react";

export type PlanDiagnosticState = 'EVALUATION_DUE' | 'COMPLETION_DUE' | 'NORMAL_TASK';

export function usePlanLifecycle() {
    const { user } = useSession();
    const queryClient = useQueryClient();
    const { duePlanIds, isLoading: loadingEval } = useWeeklyEvaluationTrigger();

    const { data: finishedPlans = [], isLoading: loadingFinished, refetch: refetchFinished } = useQuery({
        queryKey: ['finished-plans', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            return await planLifecycleService.getFinishedPlans(user.id);
        },
        enabled: !!user?.id,
        refetchInterval: 1000 * 10, // Check every 10s
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    const markSeenMutation = useMutation({
        mutationFn: async ({ planType, localRefId }: { planType: 'HIFZ' | 'MURAJA', localRefId: number }) => {
            if (!user?.id) return;
            await planLifecycleService.markAchievementSeen(user.id, planType, localRefId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finished-plans', user?.id] });
        }
    });

   
    const getPlanState = useMemo(() => (planId: number | undefined, type: 'HIFZ' | 'MURAJA'): PlanDiagnosticState => {
        if (!planId) return 'NORMAL_TASK';

        if (duePlanIds.includes(planId)) {
            return 'EVALUATION_DUE';
        }

        const isFinished = finishedPlans.some(p => p.localRefId === planId && p.activityType === type);
        if (isFinished) {
            return 'COMPLETION_DUE';
        }

        return 'NORMAL_TASK';
    }, [duePlanIds, finishedPlans]);

    return {
        finishedPlans,
        isLoading: loadingEval || loadingFinished,
        getPlanState,
        refetch: async () => {
            await refetchFinished();
        },
        markAchievementSeen: markSeenMutation.mutateAsync
    };
}
