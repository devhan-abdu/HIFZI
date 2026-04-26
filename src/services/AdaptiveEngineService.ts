import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "../features/hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "../features/muraja/database/murajaSchema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

export type PerformanceLevel = "GREEN" | "YELLOW" | "RED";

export type WeeklyPerformanceReport = {
  completionRate: number;
  averageQuality: number;
  consistencyScore: number;
  level: PerformanceLevel;
  recommendation: string;
};

export const AdaptiveEngineService = {
  async evaluateWeeklyPerformance(
    userId: string,
    weekStartDate: string
  ): Promise<WeeklyPerformanceReport> {
    
    const plans = await db.query.weeklyMurajaPlans.findMany({
      where: eq(weeklyMurajaPlans.userId, userId),
      columns: { id: true }
    });
    const planIds = plans.map(p => p.id);

    const murajaLogs = planIds.length > 0 
      ? await db.query.dailyMurajaLogs.findMany({
          where: and(inArray(dailyMurajaLogs.planId, planIds), gte(dailyMurajaLogs.date, weekStartDate)),
          columns: { status: true, qualityScore: true }
        })
      : [];

    const allHifzLogs = await db.query.hifzLogs.findMany({
      where: and(eq(hifzLogs.userId, userId), gte(hifzLogs.date, weekStartDate)),
      columns: { status: true, qualityScore: true }
    });

    const allLogs = [
      ...murajaLogs.map(l => ({ status: l.status, quality_score: l.qualityScore })),
      ...allHifzLogs.map(l => ({ status: l.status, quality_score: l.qualityScore }))
    ];

    if (allLogs.length === 0) {
      return {
        completionRate: 0,
        averageQuality: 0,
        consistencyScore: 0,
        level: "YELLOW",
        recommendation: "Not enough data for this week. Keep going!",
      };
    }

    const completed = allLogs.filter((l) => l.status === "completed").length;
    const completionRate = (completed / allLogs.length) * 100;

    const qualityScores = allLogs
      .map((l) => l.quality_score)
      .filter((q): q is number => q !== null && q !== undefined);
    
    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
      : 0;

    let level: PerformanceLevel = "YELLOW";
    let recommendation = "";

    if (completionRate >= 85 && averageQuality >= 4) {
      level = "GREEN";
      recommendation = "Excellent work! You're ready to increase your workload by 10%. Keep the Itqan high!";
    } else if (completionRate < 60 || (averageQuality < 3 && averageQuality > 0)) {
      level = "RED";
      recommendation = "Recovery Week Activated. We've paused new Hifz to help you solidify your current pages. Focus on quality over quantity.";
    } else {
      level = "YELLOW";
      recommendation = "Steady progress. Maintain your current pace and focus on consistent daily recitation.";
    }

    return {
      completionRate,
      averageQuality,
      consistencyScore: completionRate,
      level,
      recommendation,
    };
  },

  async applyRecommendation(userId: string, level: PerformanceLevel) {
    if (level === "RED") {
      await db.update(hifzPlans)
        .set({ status: 'paused', syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
    }
  }
};
