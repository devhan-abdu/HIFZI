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
        }
    });

    return {
        createPlan: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error
    };
}