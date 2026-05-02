import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hifzService } from "../services/hifzService";

export function useAddLog() {
    const { user } = useSession();
    const queryClient = useQueryClient();
    
    const mutation = useMutation({
        mutationFn: async (payload: { todayLog: any, userId?: string }) => {
            const displayName = user?.user_metadata?.full_name || "Hafiz";
            return await hifzService.todayLog(payload.userId || user?.id || '', payload.todayLog, displayName);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["latest-notification", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["page-performance-all"] });
            
            if (result?.changed) {
                queryClient.invalidateQueries({ queryKey: ["adaptive-guidance", user?.id] });
            }
        }
    });

    return {
        addLog: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error
    };
}
