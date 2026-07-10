import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hifzService } from "../services/hifzService";
import { IHifzPlan } from "../types";

export function useSaveHifzPlanHifz() {
    const { user } = useSession();
    const queryClient = useQueryClient();
    
    const mutation = useMutation({
        mutationFn: async (newPlanData: Omit<IHifzPlan, "id" | "hifzDailyLogs">) => {
            if (!user?.id) throw new Error("User not authenticated");
            return await hifzService.createPlan({
                ...newPlanData,
                userId: user.id,
                status: 'active'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["activityPlans", user?.id] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ planId, payload }: { planId: number; payload: Partial<IHifzPlan> }) => {
            if (!user?.id) throw new Error("User not authenticated");
            return await hifzService.updatePlan(planId, {
                ...payload,
                userId: user.id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["activityPlans", user?.id] });
        }
    });

    return {
        savePlan: mutation.mutateAsync,
        updatePlan: updateMutation.mutateAsync,
        isSaving: mutation.isPending || updateMutation.isPending,
        error: mutation.error || updateMutation.error
    };
}
