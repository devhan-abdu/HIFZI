import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "../../hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "../../muraja/database/murajaSchema";
import { testLogs } from "../../test/database/testSchema";
import { explainPlan } from "../../ai/services/quranAI";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { activityPlans } from "../../habits/database/habitSchema";

export type EvaluationStatus = "Elite" | "Polishing" | "Retake" | "Recovery" | "Spark";

export interface WeeklyPerformanceReport {
  hifzCompletion: number;
  hifzQuality: number;
  murajaCompletion: number;
  murajaQuality: number;
  status: EvaluationStatus;
  coachMessage: string;
  hifzTestScore?: number;
  murajaTestScore?: number;
  hifzTestPages: number[];
  murajaTestPages: number[];
  recommendation: string;
  suggestedHifzTarget: number;
  suggestedMurajaTarget: number;
  finalRule: string;
  evaluatedTypes: ("HIFZ" | "MURAJA")[];
  avgRate: number;
  avgQuality: number;
}

export const AdaptivePlanService = {
  async evaluateWeeklyPerformance(
    userId: string,
    weekStartDate: string,
    duePlanIds: number[] = []
  ): Promise<WeeklyPerformanceReport> {
    let evaluatedTypes: ("HIFZ" | "MURAJA")[] = [];
    if (duePlanIds.length > 0) {
      const plans = await db.query.activityPlans.findMany({
        where: inArray(activityPlans.id, duePlanIds),
      });
      evaluatedTypes = plans
        .map((p) => p.activityType as "HIFZ" | "MURAJA")
        .filter((t) => t === "HIFZ" || t === "MURAJA");
    } else {
      evaluatedTypes = ["HIFZ", "MURAJA"];
    }

    const isHifzDue = evaluatedTypes.includes("HIFZ");
    const isMurajaDue = evaluatedTypes.includes("MURAJA");

    const hifzPlan = isHifzDue 
      ? await db.query.hifzPlans.findFirst({
          where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active'))
        })
      : null;

    const murajaPlan = isMurajaDue
      ? await db.query.weeklyMurajaPlans.findFirst({
          where: eq(weeklyMurajaPlans.userId, userId)
        })
      : null;

    const murajaLogs = (isMurajaDue && murajaPlan)
      ? await db.query.dailyMurajaLogs.findMany({
          where: and(eq(dailyMurajaLogs.planId, murajaPlan.id), gte(dailyMurajaLogs.date, weekStartDate)),
        })
      : [];

    const hifzLogsList = isHifzDue
      ? await db.query.hifzLogs.findMany({
          where: and(eq(hifzLogs.userId, userId), gte(hifzLogs.date, weekStartDate)),
        })
      : [];

    const calcStats = (logs: any[]) => {
      if (logs.length === 0) return { rate: 0, quality: 0 };
      const completed = logs.filter(l => l.status === 'completed').length;
      const rate = (completed / logs.length) * 100;
      const scores = logs.map(l => l.qualityScore || 0).filter(q => q > 0);
      const quality = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { rate, quality };
    };

    const hifzStats = calcStats(hifzLogsList);
    const murajaStats = calcStats(murajaLogs);

    const getPagesFromLogs = (logs: any[]) => {
      const pages = new Set<number>();
      logs.forEach(l => {
        if (l.actualStartPage !== undefined && l.actualEndPage !== undefined) {
          const start = Math.min(l.actualStartPage, l.actualEndPage);
          const end = Math.max(l.actualStartPage, l.actualEndPage);
          for (let i = start; i <= end; i++) pages.add(i);
        } 
        else if (l.startPage !== undefined && l.completedPages !== undefined) {
          const start = l.startPage;
          const end = start + (l.completedPages > 0 ? l.completedPages - 1 : 0);
          for (let i = start; i <= end; i++) pages.add(i);
        }
      });
      return Array.from(pages);
    };

    const hifzTestPages = getPagesFromLogs(hifzLogsList);
    const murajaTestPages = getPagesFromLogs(murajaLogs);

    const tests = await db.query.testLogs.findMany({
      where: and(eq(testLogs.userId, userId), gte(testLogs.date, weekStartDate)),
      orderBy: [desc(testLogs.date)]
    });

    const hifzTest = tests.find(t => t.type === 'HIFZ');
    const murajaTest = tests.find(t => t.type === 'MURAJA');

    const hifzTestScore = hifzTest ? (hifzTest.score / hifzTest.totalQuestions) * 100 : undefined;
    const murajaTestScore = murajaTest ? (murajaTest.score / murajaTest.totalQuestions) * 100 : undefined;

    const currentHifzTarget = hifzPlan?.pagesPerDay || 1;
    const currentMurajaTarget = murajaPlan?.plannedPagesPerDay || 2;

    const getCombinedScore = (rate: number, testScore: number | undefined, quality: number) => {
        // If they took a test, that is the most important (60%)
        // If no test, self-reported quality is less reliable, so we favor Rate (70% Rate / 30% Quality)
        if (testScore !== undefined) {
            return (rate * 0.4) + (testScore * 0.6);
        }
        
        const qualityPercent = (quality / 5) * 100;
        return (rate * 0.7) + (qualityPercent * 0.3);
    };

    const hifzCombined = getCombinedScore(hifzStats.rate, hifzTestScore, hifzStats.quality);
    const murajaCombined = getCombinedScore(murajaStats.rate, murajaTestScore, murajaStats.quality);

    const isHifzGood = hifzCombined >= 75 && hifzStats.rate >= 80;
    const isMurajaGood = murajaCombined >= 75 && murajaStats.rate >= 80;
    let suggestedHifz = currentHifzTarget;
    let suggestedMuraja = currentMurajaTarget;
    let status: EvaluationStatus = "Polishing";
    let finalRule = "no_change";
    let recommendation = "";

    if (isMurajaGood && !isHifzGood) {
        suggestedHifz = currentHifzTarget - 1;
        status = "Polishing";
        finalRule = "case_1_reduce_hifz";
        recommendation = "Revision is solid, but Hifz was a bit difficult. Reducing load to ensure better memorization.";
    } else if (!isMurajaGood && isHifzGood) {
        suggestedHifz = Math.floor(currentHifzTarget * 0.5);
        suggestedMuraja = currentMurajaTarget + 1;
        status = "Recovery";
        finalRule = "case_2_prioritize_muraja";
        recommendation = "Revision needs more attention. Cutting Hifz load temporarily to help you stabilize previous pages.";
    } else if (!isMurajaGood && !isHifzGood) {
        suggestedHifz = currentHifzTarget - 1;
        suggestedMuraja = currentMurajaTarget - 1;
        status = "Recovery";
        finalRule = "case_3_recovery_mode";
        recommendation = "Both Hifz and Muraja were difficult this week. Let's reduce both targets to rebuild your consistency.";
    } else if (isMurajaGood && isHifzGood) {
        suggestedHifz = currentHifzTarget + 1;
        status = "Elite";
        finalRule = "case_4_progression";
        recommendation = "Excellent performance across the board! Increasing Hifz load slightly to maintain your momentum.";
    }

    if (hifzStats.rate < 20 && murajaStats.rate < 20) {
        status = "Spark";
        suggestedHifz = 0.5;
        suggestedMuraja = 1;
        recommendation = "Consistency is key. Let's start small with a minimal goal to rebuild the habit.";
    }

   
    if (suggestedHifz > currentHifzTarget + 1) suggestedHifz = currentHifzTarget + 1;
    if (suggestedMuraja > currentMurajaTarget + 1) suggestedMuraja = currentMurajaTarget + 1;

    const applySafeDecrease = (suggested: number, current: number) => {
        if (suggested < current) {
            const fiftyPercent = Math.floor(current * 0.5);
            const minusTwo = current - 2;
            const maxAllowedDecrease = Math.max(fiftyPercent, minusTwo);
            return Math.max(0.5, Math.max(suggested, maxAllowedDecrease));
        }
        return suggested;
    };

    suggestedHifz = applySafeDecrease(suggestedHifz, currentHifzTarget);
    suggestedMuraja = applySafeDecrease(suggestedMuraja, currentMurajaTarget);

    const statsCount = (isHifzDue ? 1 : 0) + (isMurajaDue ? 1 : 0);
    const avgRate = statsCount > 0 ? (hifzStats.rate + murajaStats.rate) / statsCount : 0;
    const avgQuality = statsCount > 0 ? (hifzStats.quality + murajaStats.quality) / statsCount : 0;

    return {
      hifzCompletion: hifzStats.rate,
      hifzQuality: hifzStats.quality,
      murajaCompletion: murajaStats.rate,
      murajaQuality: murajaStats.quality,
      status,
      coachMessage: "", 
      hifzTestScore,
      murajaTestScore,
      hifzTestPages,
      murajaTestPages,
      recommendation,
      suggestedHifzTarget: Number(suggestedHifz.toFixed(2)),
      suggestedMurajaTarget: Math.round(suggestedMuraja),
      finalRule,
      evaluatedTypes,
      avgRate,
      avgQuality
    };
  },

  async getCoachMessage(
    avgRate: number,
    avgQuality: number,
    testScore: number | undefined,
    type: 'HIFZ' | 'MURAJA',
    status: EvaluationStatus,
    recommendation: string,
    isFinal: boolean
  ) {
    return await explainPlan(
      { 
        completionRate: avgRate, 
        averageQuality: avgQuality, 
        testScore, 
        type,
        isFinalEvaluation: isFinal,
        mentorContext: isFinal 
          ? `This is the final consultation. The goal is to explain why the user was placed on the [${status}] path and why their new targets were set. Mention that effort was ${avgRate.toFixed(0)}% and exam mastery was ${testScore ? testScore.toFixed(0) : 'N/A'}%. Be transparent about target adjustments.` 
          : "This is a preliminary analysis. Acknowledge their daily consistency but emphasize that the exam is needed to prove mastery before we can safely adjust their targets."
      },
      { status, recommendation }
    );
  },

  async applyRecommendation(
    userId: string, 
    hifzTarget: number,
    murajaTarget: number,
    evaluatedTypes: ("HIFZ" | "MURAJA")[]
  ) {
    await db.transaction(async (tx) => {
      if (evaluatedTypes.includes("HIFZ")) {
        await tx.update(hifzPlans)
          .set({ pagesPerDay: hifzTarget, syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
      }

      if (evaluatedTypes.includes("MURAJA")) {
        await tx.update(weeklyMurajaPlans)
          .set({ plannedPagesPerDay: murajaTarget, syncStatus: 0 })
          .where(eq(weeklyMurajaPlans.userId, userId));
      }
    });
  }
};
