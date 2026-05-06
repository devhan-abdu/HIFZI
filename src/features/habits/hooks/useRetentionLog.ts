
import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/src/lib/db/local-client";
import { PageMasteryService } from "@/src/services/PageMasteryService";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";
import { habitProgressService } from "@/src/features/habits/services/habitProgressService";
import { userStats } from "@/src/features/user/database/userSchema";
import { eq } from "drizzle-orm";

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

        // 4. Award XP and process rewards
        const stats = await tx.query.userStats.findFirst({
          where: eq(userStats.userId, user.id!)
        });
        const currentStreak = stats?.hifzCurrentStreak || 0;

        await GamificationService.processSessionCompletion(
          tx,
          user.id!,
          payload.quality,
          currentStreak
        );
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["page-performance-all"] });
      queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
    },
  });

  return {
    logRetention: mutation.mutateAsync,
    isLogging: mutation.isPending,
  };
}
