import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
;
import { useSession } from "@/src/hooks/useSession";
import { getGuidanceInputSnapshot } from "../services/performanceEngine";
import { createPlanSuggestion } from "../services/planningEngine";
import { explainPlan } from "@/src/features/ai/services/quranAI";
import {
  getCachedGuidance,
  upsertCachedGuidance,
} from "@/src/features/habits/services/habitProgressService";
import { useSQLiteContext } from "expo-sqlite";

type GuidancePayload = {
  summary: Awaited<ReturnType<typeof getGuidanceInputSnapshot>>["summary"];
  suggestion: ReturnType<typeof createPlanSuggestion>;
  explanation: string;
  activityHash?: string;
  isStale?: boolean;
};

export function useAdaptiveGuidance(_activityHash: string) {
  const db = useSQLiteContext();
  const { user } = useSession();
  const userId = user?.id ?? "local-user";

  return useQuery({
    queryKey: ["adaptive-guidance", userId, _activityHash],
    enabled: !!user?.id,
    queryFn: async (): Promise<GuidancePayload> => {
      const guidanceInput = await getGuidanceInputSnapshot(db, userId, { days: 14 });
      const guidanceFingerprint = guidanceInput.fingerprint;
      const cached = await getCachedGuidance(db, userId);

      if (cached && cached.activityHash === guidanceFingerprint) {
        try {
          const payload = JSON.parse(cached.payload) as GuidancePayload;
          return { ...payload, isStale: false, activityHash: guidanceFingerprint };
        } catch (e) {}
      }

    
      if (cached) {
        try {
          const payload = JSON.parse(cached.payload) as GuidancePayload;
          return { ...payload, isStale: true, activityHash: guidanceFingerprint };
        } catch (e) {}
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
      
      return { ...payload, isStale: false, activityHash: guidanceFingerprint };
    },
  });
}

export function useRefreshGuidance() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "local-user";

  return useMutation({
    mutationFn: async () => {
      const guidanceInput = await getGuidanceInputSnapshot(db, userId, { days: 14 });
      const summary = guidanceInput.summary;
      const suggestion = createPlanSuggestion(summary);
      const explanation = await explainPlan(summary, suggestion);
      const payload: GuidancePayload = { summary, suggestion, explanation };
      
      await upsertCachedGuidance(db, {
        userId,
        activityHash: guidanceInput.fingerprint,
        data: payload,
      });
      
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adaptive-guidance", userId] });
    },
  });
}
