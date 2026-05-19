import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/src/lib/db/local-client";
import { PageMasteryService } from "@/src/services/PageMasteryService";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";
import { habitProgressService } from "@/src/features/habits/services/habitProgressService";
import { habitAnalyticsService } from "@/src/features/habits/services/habitAnalyticsService";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { activityLogs } from "@/src/features/habits/database/habitSchema";
import { userStats } from "@/src/features/user/database/userSchema";
import { and, eq } from "drizzle-orm";
import { notificationService } from "@/src/features/notifications/services/notificationService";

const RETENTION_LOCAL_LOG_ID = -1;

interface RetentionPayload {
  pages: number[];
  quality: number; 
  date: string;
}

export function useRetentionLog() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: RetentionPayload) => {
      if (!user?.id || !payload.pages.length) return;

      const quality: 'perfect' | 'medium' | 'low' = 
        payload.quality >= 5 ? 'perfect' : payload.quality <= 2 ? 'low' : 'medium';

      let xpResult: any = null;

      await db.transaction(async (tx) => {
        await PerformanceService.updatePagesPerformance(
          tx,
          user.id,
          payload.pages,
          payload.quality
        );

        await PageMasteryService.logPagesActivity(
          tx,
          user.id,
          -1, 
          payload.date,
          payload.pages,
          'muraja',
          quality
        );

        await habitProgressService.upsertHabitProgressLog(tx, {
          userId: user.id,
          date: payload.date,
          activityType: 'MURAJA',
          minutesSpent: Math.max(1, payload.pages.length * 2),
          unitsCompleted: payload.pages.length,
          eventType: 'MURAJA_COMPLETED',
          metadata: JSON.stringify({
            pages: payload.pages,
            qualityScore: payload.quality,
            isReinforcement: true
          }),
          localRefId: -100 
        });

        const stats = await tx.query.userStats.findFirst({
          where: eq(userStats.userId, user.id!)
        });
        const currentStreak = stats?.hifzCurrentStreak || 0;

        xpResult = await GamificationService.processSessionCompletion(
          tx,
          user.id!,
          payload.quality,
          currentStreak
        );

        await habitAnalyticsService.recalculateStreaks(user.id!);
      });

      if (xpResult && user?.id) {
        await notificationService.processHabitEvent({
          userId: user.id,
          habitType: 'muraja',
          status: 'completed',
          date: payload.date,
          rewards: {
            levelUp: xpResult.levelUp,
            badges: xpResult.badges
          }
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["page-performance-all"] });
      queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions-v2", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["reinforcement-status", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-badges", user?.id] });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (pages: number[]) => {
      if (!user?.id || !pages.length) return;

      const todayStr = new Date().toISOString().slice(0, 10);

      await db.transaction(async (tx) => {
        for (const pageId of pages) {
          await tx
            .delete(pageActivityLogs)
            .where(
              and(
                eq(pageActivityLogs.userId, user.id!),
                eq(pageActivityLogs.pageId, pageId),
                eq(pageActivityLogs.logDate, todayStr),
                eq(pageActivityLogs.localLogId, RETENTION_LOCAL_LOG_ID),
              ),
            );
        }

        const retentionLogs = await tx.query.activityLogs.findMany({
          where: and(
            eq(activityLogs.userId, user.id!),
            eq(activityLogs.date, todayStr),
            eq(activityLogs.localRefId, -100),
          ),
        });

        for (const log of retentionLogs) {
          try {
            const meta = JSON.parse(log.metadata ?? "{}");
            const loggedPages: number[] = meta.pages ?? [];
            const overlaps = pages.some((p) => loggedPages.includes(p));
            if (overlaps) {
              await tx.delete(activityLogs).where(eq(activityLogs.id, log.id));
            }
          } catch {
            // skip malformed metadata
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions-v2", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["reinforcement-status", user?.id] });
    },
  });

  return {
    logRetention: mutation.mutateAsync,
    undoRetention: undoMutation.mutateAsync,
    isLogging: mutation.isPending || undoMutation.isPending,
  };
}
