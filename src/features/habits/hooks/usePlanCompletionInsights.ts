import { useQuery } from "@tanstack/react-query";
import { hifzService } from "@/src/features/hifz/services/hifzService";
import { murajaService } from "@/src/features/muraja/services/murajaService";
import {
  buildHifzCompletionReport,
  buildMurajaCompletionReport,
} from "@/src/features/habits/utils/planCompletionReport";
import { ISurah } from "@/src/types";

export function usePlanCompletionInsights(
  userId: string | undefined,
  planType: "HIFZ" | "MURAJA" | undefined,
  planId: string | undefined,
  surahData: ISurah[] | undefined,
) {
  return useQuery({
    queryKey: ["plan-completion-insights", planType, planId, userId],
    queryFn: async () => {
      if (!userId || !planId || !surahData?.length || !planType) return null;

      const numericId = parseInt(planId, 10);
      if (Number.isNaN(numericId)) return null;

      if (planType === "HIFZ") {
        const plan = await hifzService.getPlan(userId, numericId);
        if (!plan?.id) return null;
        return buildHifzCompletionReport(plan, userId, surahData);
      }

      const plan = await murajaService.getPlanById(userId, numericId);
      if (!plan?.id) return null;
      return buildMurajaCompletionReport(plan, userId, surahData);
    },
    enabled: !!userId && !!planId && !!surahData?.length && !!planType,
  });
}
