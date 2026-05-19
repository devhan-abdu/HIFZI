import { useSession } from "@/src/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { habitSummaryService } from "../services/habitSummaryService";
import { useMemo } from "react";
import { format, subDays } from "date-fns";

export function useWeeklyEvaluationTrigger() {
  const { user } = useSession();

  const { data: duePlans = [], isLoading } = useQuery({
    queryKey: ['weekly-evaluation-due', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await habitSummaryService.getDueEvaluationPlans(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 5, // Check every 5 minutes instead of 1 hour
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const duePlanIds = useMemo(() => 
    duePlans
      .map(p => p.localRefId)
      .filter((id): id is number => id !== null), 
    [duePlans]
  );

  const isDue = duePlanIds.length > 0;

  const weekStartDate = useMemo(() => {
    return format(subDays(new Date(), 7), "yyyy-MM-dd");
  }, []);

  return useMemo(() => ({
    isDue,
    duePlans,
    duePlanIds,
    isLoading,
    weekStartDate
  }), [isDue, duePlans, duePlanIds, isLoading, weekStartDate]);
}
