
import { useSession } from "@/src/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/src/lib/db/local-client";
import { PageMasteryService } from "@/src/services/PageMasteryService";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";

interface RetentionPayload {
  startPage: number;
  endPage: number;
  quality: number; // 1-5
  date: string;
}

export function useRetentionLog() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: RetentionPayload) => {
      if (!user?.id) return;

      const quality: 'perfect' | 'medium' | 'low' = 
        payload.quality >= 5 ? 'perfect' : payload.quality <= 2 ? 'low' : 'medium';

      await db.transaction(async (tx) => {
        await PerformanceService.updateRangePerformance(
          tx,
          user.id,
          payload.startPage,
          payload.endPage,
          payload.quality
        );

        await PageMasteryService.logPageRangeActivity(
          tx,
          user.id,
          -1, 
          payload.date,
          payload.startPage,
          payload.endPage,
          'muraja',
          quality
        );
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-progress", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["page-performance-all"] });
      queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions", user?.id] });
    },
  });

  return {
    logRetention: mutation.mutateAsync,
    isLogging: mutation.isPending,
  };
}
