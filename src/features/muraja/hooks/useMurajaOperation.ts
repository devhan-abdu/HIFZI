import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { murajaService } from "../services/murajaService";
import { IDailyMurajaLog } from "../types";

export function useMurajaOperation() {
    const { user } = useSession();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (log: IDailyMurajaLog) => {
            if (!user?.id) throw new Error("User not found");
            const displayName = user?.user_metadata?.full_name || "Hafiz";
            return await murajaService.upsertLog(user.id, log, displayName);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["latest-notification", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
            
            if (result.changed) {
                queryClient.invalidateQueries({ queryKey: ["adaptive-guidance", user?.id] });
            }
        }
    });

    return {
        updateLog: mutation.mutateAsync,
        isUpdating: mutation.isPending,
        error: mutation.error
    };
}
