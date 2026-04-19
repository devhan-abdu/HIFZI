import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { murajaServices } from "../services/murajaServices";
import { useSQLiteContext } from "expo-sqlite";
import { localMurajaService } from "../services/localMurajaService";
import { IWeeklyMurajaPLan } from "../types";

export function useCreatePlan() {
    const { user } = useSession()
    const db = useSQLiteContext();
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async (payload: Omit<IWeeklyMurajaPLan, "id">) => {
            const localId = await localMurajaService.createPlan(db, payload)
            try {

                const remotePlanId = await murajaServices.createCompletePlan(payload)
                await db.runAsync(
                   "UPDATE weekly_muraja_plan SET remote_id = ?, sync_status = 1 WHERE id = ?",
                    [remotePlanId, localId]  
                )
              } catch (e) {
                console.log("Offline: Plan saved locally, will sync later.");
             }
            return localId
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["muraja-dashboard", user?.id]})
        }
    })

    return {
        createPlan: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error
    }
}