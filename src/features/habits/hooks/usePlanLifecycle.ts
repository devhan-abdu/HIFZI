import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planLifecycleService } from "../services/planLifecycleService";

export type PlanDiagnosticState = 'EVALUATION_DUE' | 'COMPLETION_DUE' | 'NORMAL_TASK';

export function usePlanLifecycle() {
    const { user } = useSession();
    const queryClient = useQueryClient();


    const markSeenMutation = useMutation({
        mutationFn: async ({ planType, localRefId }: { planType: 'HIFZ' | 'MURAJA', localRefId: number }) => {
            if (!user?.id) return;
            await planLifecycleService.markAchievementSeen(user.id, planType, localRefId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finished-plans', user?.id] });
        }
    });

    return {
     
        markAchievementSeen: markSeenMutation.mutateAsync
    };
}
