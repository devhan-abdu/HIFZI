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
        }
    });

    return {
        savePlan: mutation.mutateAsync,
        isSaving: mutation.isPending,
        error: mutation.error
    };
}
