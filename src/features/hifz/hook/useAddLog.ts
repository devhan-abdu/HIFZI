
import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hifzServices } from "../services/hifz";
import { useSQLiteContext } from "expo-sqlite";
;
import { HabitRepository } from "@/src/features/habits/services/habitRepository";
import { processHabitEventAndNotify } from "@/src/services/notificationService";

export function useAddLog() {
    const { user } = useSession()
    const db = useSQLiteContext()
    const queryClient = useQueryClient()
    
    const mutation = useMutation({
        mutationFn: async (payload: Parameters<typeof hifzServices.todayLog>[1]) => {
          const result = await hifzServices.todayLog(db, payload);
          if (user?.id && result?.changed) {
            await processHabitEventAndNotify(db, {
              userId: user.id,
              displayName: user.user_metadata?.full_name ?? user.email ?? "Hafiz",
              habitType: "hifz",
              status: payload.todayLog.status,
              date: payload.todayLog.date,
            });
          }
          if (user?.id && result?.changed) {
            void new HabitRepository(db).syncPendingLogs(user.id).catch((error) => {
              console.warn("Habit activity sync queued for retry:", error?.message ?? error);
            });
          }
          return result;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({queryKey: ["hifz", user?.id]})
            queryClient.invalidateQueries({queryKey: ["habit-progress", user?.id]})
            queryClient.invalidateQueries({queryKey: ["latest-notification", user?.id]})
            queryClient.invalidateQueries({queryKey: ["hifz-review-suggestions", user?.id]})
            queryClient.invalidateQueries({queryKey: ["notifications", user?.id]})
            if (result?.changed) {
              queryClient.invalidateQueries({queryKey: ["adaptive-guidance"]})
            }
        }
    })

    return {
        addLog: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error
    }
}
