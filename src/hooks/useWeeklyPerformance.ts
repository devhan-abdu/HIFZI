import { useQuery } from "@tanstack/react-query";
import { AdaptiveEngineService } from "../services/AdaptiveEngineService";

export function useWeeklyPerformance(userId: string, weekStart: string) {
  return useQuery({
    queryKey: ["weekly-performance-report", userId, weekStart],
    queryFn: () => AdaptiveEngineService.evaluateWeeklyPerformance(userId, weekStart),
    staleTime: 1000 * 60 * 30, 
  });
}
