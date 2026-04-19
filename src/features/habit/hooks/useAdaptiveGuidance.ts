import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useSession } from "@/src/hooks/useSession";
import { getGuidanceInputSnapshot } from "../services/performanceEngine";
import { createPlanSuggestion } from "../services/planningEngine";
import { explainPlan } from "@/src/features/ai/services/quranAI";
import {
  getCachedGuidance,
  upsertCachedGuidance,
} from "@/src/features/habits/services/habitProgressService";

type GuidancePayload = {
  summary: Awaited<ReturnType<typeof getGuidanceInputSnapshot>>["summary"];
  suggestion: ReturnType<typeof createPlanSuggestion>;
  explanation: string;
};

export function useAdaptiveGuidance(_activityHash: string) {
  const db = useSQLiteContext();
  const { user } = useSession();
  const userId = user?.id ?? "local-user";

  return useQuery({
    queryKey: ["adaptive-guidance", userId],
    enabled: !!user?.id,
    queryFn: async (): Promise<GuidancePayload> => {
      const guidanceInput = await getGuidanceInputSnapshot(db, userId, { days: 14 });
      const guidanceFingerprint = guidanceInput.fingerprint;
      const cached = await getCachedGuidance(db, userId);
      if (cached?.activity_hash === guidanceFingerprint) {
        try {
          return JSON.parse(cached.payload) as GuidancePayload;
        } catch {
          // Fall back to regeneration on parse errors.
        }
      }

      const summary = guidanceInput.summary;
      const suggestion = createPlanSuggestion(summary);
      const explanation = await explainPlan(summary, suggestion);
      const payload: GuidancePayload = { summary, suggestion, explanation };
      await upsertCachedGuidance(db, {
        userId,
        activityHash: guidanceFingerprint,
        data: payload,
      });
      return payload;
    },
  });
}
