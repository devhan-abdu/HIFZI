import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { murajaService } from "../services/murajaService";
import { IWeeklyMurajaPLan } from "../types";

export function useCreatePlan() {
    const { user } = useSession();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (payload: Omit<IWeeklyMurajaPLan, "id">) => {
            return await murajaService.createPlan(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["muraja-review", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["activity-plans", user?.id] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ planId, payload }: { planId: number; payload: Partial<IWeeklyMurajaPLan> }) => {
            return await murajaService.updatePlan(planId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["muraja-review", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["activity-plans", user?.id] });
        }
    });

    return {
        createPlan: mutation.mutateAsync,
        updatePlan: updateMutation.mutateAsync,
        isCreating: mutation.isPending || updateMutation.isPending,
        error: mutation.error || updateMutation.error
    };
}