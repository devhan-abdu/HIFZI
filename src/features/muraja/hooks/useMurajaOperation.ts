import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localMurajaService } from "../services/localMurajaService";
import { useSQLiteContext } from "expo-sqlite";
;
import { IDailyMurajaLog } from "../types";
import { murajaServices } from "../services/murajaServices";
import { insertHabitProgressLog } from "@/src/features/habits/services/habitProgressService";
import { HabitRepository } from "@/src/features/habits/services/habitRepository";
import { processHabitEventAndNotify } from "@/src/services/notificationService";

export function useMurajaOperation() {
    const { user } = useSession()
    const queryClient = useQueryClient()
    const db = useSQLiteContext()

    const mutation = useMutation({
        mutationFn: async (log: IDailyMurajaLog) => {
            if (!user?.id) throw new Error("User not found");
            
          const localWrite = await localMurajaService.upsertLog(db, user.id, log);
          const localId = localWrite.localLogId;
          const isUndo = log.status === "pending" || (log.completed_pages ?? 0) <= 0;
          const normalizedDate = log.date;

          if (localWrite.changed && isUndo) {
            // Ensure the normalized event ledger is updated even when the domain log is deleted/reset.
            await insertHabitProgressLog(db, {
              userId: user.id,
              date: normalizedDate,
              activityType: "MURAJA",
              minutesSpent: 0,
              unitsCompleted: 0,
              note: null,
              planId: log.plan_id,
              localRefId: localId,
              eventType: "TASK_UNDONE",
              reference: null,
            });
          } else if (localWrite.changed && log.status === "missed") {
            await insertHabitProgressLog(db, {
              userId: user.id,
              date: normalizedDate,
              activityType: "MURAJA",
              minutesSpent: 0,
              unitsCompleted: 0,
              note: null,
              planId: log.plan_id,
              localRefId: localId,
              eventType: "TASK_MISSED",
              reference: null,
            });
          } else if (localWrite.changed && (log.completed_pages ?? 0) > 0) {
            await insertHabitProgressLog(db, {
              userId: user.id,
              date: normalizedDate,
              activityType: "MURAJA",
              minutesSpent: log.actual_time_min ?? 0,
              unitsCompleted: log.completed_pages ?? 0,
              note: null,
              planId: log.plan_id,
              localRefId: localId,
              eventType: "MURAJA_COMPLETED",
            });
          }
           
          if (localWrite.changed && !isUndo) {
            try {
          const remoteResponse = await murajaServices.upsertLog(db, log ,user.id);
        
        if (remoteResponse?.id) {
            await db.runAsync(
                "UPDATE daily_muraja_logs SET remote_id = ?, sync_status = 1 WHERE id = ?",
                [remoteResponse.id, localId]
            );
        }
      } catch (e: any) {
            console.warn("Sync failed - staying in offline mode:", e.message);        
            }
          }

          if (
            localWrite.changed &&
            localWrite.currentStatus !== "pending" &&
            (log.status === "completed" || log.status === "partial" || log.status === "missed")
          ) {
            await processHabitEventAndNotify(db, {
              userId: user.id,
              displayName: user.user_metadata?.full_name ?? user.email ?? "Hafiz",
              habitType: "muraja",
              status: log.status,
              date: normalizedDate,
            });
          }
          if (localWrite.changed) {
            void murajaServices.syncPendingLogs(db, user.id);
            void new HabitRepository(db).syncPendingLogs(user.id).catch((error) => {
              console.warn("Habit activity sync queued for retry:", error?.message ?? error);
            });
          }
            
            return {
              localId,
              meaningfulChange: localWrite.changed,
            };

        },     
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["latest-notification", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
            if (result?.meaningfulChange) {
              queryClient.invalidateQueries({ queryKey: ["adaptive-guidance"] });
            }
        }
    })

    return {
        updateLog: mutation.mutateAsync,
        isUpdating: mutation.isPending,
        error: mutation.error
    }
}
