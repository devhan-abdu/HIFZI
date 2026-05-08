import { useQuery } from "@tanstack/react-query";
import { db } from "@/src/lib/db/local-client";
import { pagePerformance } from "@/src/features/user/database/userSchema";

export interface PagePerformanceData {
  pageNumber: number;
  stability: number;
  lastReviewedAt: string | null;
  consecutivePerfects: number;
  lastSessionQuality: string | null;
  lastMistakesCount: number | null;
}

export function usePagePerformance() {
  return useQuery({
    queryKey: ["page-performance-all"],
    queryFn: async () => {
      const rows = await db.select({
        pageNumber: pagePerformance.pageNumber,
        stability: pagePerformance.stability,
        lastReviewedAt: pagePerformance.lastReviewedAt,
        consecutivePerfects: pagePerformance.consecutivePerfects,
        lastSessionQuality: pagePerformance.lastSessionQuality,
        lastMistakesCount: pagePerformance.lastMistakesCount,
      }).from(pagePerformance);
      
      const map = new Map<number, PagePerformanceData>();
      rows.forEach((r) => map.set(r.pageNumber, r as PagePerformanceData));
      return map;
    },
  });
}

/**
 * Calculates the R (Retrievability) based on the FSRS/memory decay model.
 * R = e^(ln(0.9) * t / S)
 */
export const calculateRetrievability = (stability: number, lastReviewedAt: string | null) => {
  if (!lastReviewedAt || stability === 0) return 0;
  const now = new Date();
  const lastReview = new Date(lastReviewedAt);
  const daysSince = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
  
  return Math.pow(Math.E, Math.log(0.9) * daysSince / stability);
};
