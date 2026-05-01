import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "../features/hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "../features/muraja/database/murajaSchema";
import { testLogs } from "../features/test/database/testSchema";
import { explainPlan } from "../features/ai/services/quranAI";
import { GamificationService } from "./GamificationService";
import { userStats } from "../features/user/database/userSchema";
import { eq, and, gte, sql, inArray, desc } from "drizzle-orm";

export type EvaluationStatus = "Elite" | "Polishing" | "Retake" | "Inconsistent";

export type WeeklyPerformanceReport = {
  completionRate: number;
  averageQuality: number;
  status: EvaluationStatus;
  coachMessage: string;
  testScore?: number;
  testPages?: number[];
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
      columns: { status: true, qualityScore: true, actualStartPage: true, actualEndPage: true }
    });

    const testPages: number[] = [];
    allHifzLogs.forEach(l => {
      if (l.actualStartPage && l.actualEndPage) {
        for (let i = Math.min(l.actualStartPage, l.actualEndPage); i <= Math.max(l.actualStartPage, l.actualEndPage); i++) {
          if (!testPages.includes(i)) testPages.push(i);
        }
      }
    });

    const allLogs = [
      ...murajaLogs.map(l => ({ status: l.status, quality_score: l.qualityScore })),
      ...allHifzLogs.map(l => ({ status: l.status, quality_score: l.qualityScore }))
    ];

    const latestTest = await db.query.testLogs.findFirst({
      where: and(eq(testLogs.userId, userId), gte(testLogs.date, weekStartDate)),
      orderBy: [desc(testLogs.date)]
    });

    if (allLogs.length === 0 && !latestTest) {
      return {
        completionRate: 0,
        averageQuality: 0,
        status: "Inconsistent",
        coachMessage: "It looks like you've been away. Let's restart with a small goal to keep the habit alive.",
        recommendation: "Switching to Spark Goal (1 Ayah/day).",
        testPages: [],
      };
    }

    const completed = allLogs.filter((l) => l.status === "completed").length;
    const totalPossible = Math.max(1, allLogs.length);
    const completionRate = (completed / totalPossible) * 100;

    const qualityScores = allLogs
      .map((l) => l.quality_score)
      .filter((q): q is number => q !== null && q !== undefined);
    
    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
      : 0;

    let status: EvaluationStatus = "Inconsistent";
    let recommendation = "";

    const testScore = latestTest ? (latestTest.score / latestTest.totalQuestions) * 100 : undefined;

    const isHifz = latestTest?.type === "HIFZ";

    if (testScore !== undefined) {
      if (isHifz) {
        if (testScore < 70) {
          if (completionRate >= 80) {
            status = "Retake";
            recommendation = "Great effort this week! You just need a bit more polish. We suggest a 2-day revision before you retake the test.";
          } else {
            status = "Polishing";
            recommendation = "Aggressive Recovery: Pausing new Hifz. We've reduced your daily load by 20% to help you catch up comfortably.";
          }
        } else if (testScore >= 95 && completionRate >= 90) {
          status = "Elite";
          recommendation = "Perfect retention! You've unlocked the Elite Path (+10% goal).";
        } else {
          status = "Polishing";
          recommendation = "Solid work, but let's solidify these pages for another day before moving on.";
        }
      } else {
        if (testScore < 60 || completionRate < 60) {
          status = "Polishing";
          recommendation = "Let's repeat this range next week to ensure it's firmly memorized.";
        } else {
          status = "Elite";
          recommendation = "Great consistency. Your revision cycle is on track!";
        }
      }
    } else {
      status = "Inconsistent";
      recommendation = "Life happens! Let's switch to a 'Spark Goal' (1 Ayah/day) to keep your streak alive.";
    }

    const coachMessage = await explainPlan(
      { completionRate, averageQuality, testScore, type: latestTest?.type || 'HIFZ' },
      { status, recommendation }
    );

    return {
      completionRate,
      averageQuality,
      status,
      coachMessage,
      testScore,
      testPages,
      recommendation,
    };
  },

  async applyRecommendation(userId: string, status: EvaluationStatus) {
    await db.transaction(async (tx) => {
      if (status === "Polishing") {
        await tx.update(hifzPlans)
          .set({ 
            status: 'paused', 
            pagesPerDay: sql`${hifzPlans.pagesPerDay} * 0.8`,
            syncStatus: 0, 
            updatedAt: sql`CURRENT_TIMESTAMP` 
          })
          .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
        
        await GamificationService.awardBadge(tx, userId, "RECOVERY_SHIELD");
        await tx.update(userStats).set({ hasRecoveryShield: true }).where(eq(userStats.userId, userId));
      } else if (status === "Retake") {
         await tx.update(userStats).set({ hasRecoveryShield: true }).where(eq(userStats.userId, userId));
         await GamificationService.awardBadge(tx, userId, "RECOVERY_SHIELD");
      } else if (status === "Inconsistent") {
        await tx.update(hifzPlans)
          .set({ pagesPerDay: 0.1, syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
        
        await GamificationService.awardBadge(tx, userId, "SPARK");
      } else if (status === "Elite") {
        await tx.update(hifzPlans)
          .set({ 
            pagesPerDay: sql`${hifzPlans.pagesPerDay} * 1.1`, 
            syncStatus: 0, 
            updatedAt: sql`CURRENT_TIMESTAMP` 
          })
          .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
        
        await GamificationService.awardBadge(tx, userId, "ELITE_PATH");
      }
    });
  }
};
