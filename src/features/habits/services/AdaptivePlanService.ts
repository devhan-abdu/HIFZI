import { getStateDb } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "../../hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "../../muraja/database/murajaSchema";
import { testLogs } from "../../test/database/testSchema";
import { explainPlan } from "../../ai/services/quranAI";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { activityPlans } from "../../habits/database/habitSchema";
import { userStats } from "../../user/database/userSchema";
import { habitProgressService } from "./habitProgressService";
import * as Crypto from 'expo-crypto';

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
  hifzCompletedDays: number;
  hifzPartialDays: number;
  murajaCompletedDays: number;
  murajaPartialDays: number;
  priorityMatrix: "Elite" | "Polishing" | "Focus" | "Reinforcement";
}

export const AdaptivePlanService = {

  async evaluateWeeklyPerformance(
    userId: string,
    weekStartDate: string,
    duePlanIds: number[] = []
  ): Promise<WeeklyPerformanceReport> {
      const db = getStateDb();
    
    const plans = duePlanIds.length > 0 
      ? await db.query.activityPlans.findMany({ where: inArray(activityPlans.localRefId, duePlanIds) })
      : await db.query.activityPlans.findMany({ where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, 'active')) });

    const hifzPlanId = plans.find(p => p.activityType === 'HIFZ')?.localRefId;
    const murajaPlanId = plans.find(p => p.activityType === 'MURAJA')?.localRefId;

    const evaluatedTypes = plans
        .map((p) => p.activityType as "HIFZ" | "MURAJA")
        .filter((t) => t === "HIFZ" || t === "MURAJA");

    const isHifzDue = evaluatedTypes.includes("HIFZ");
    const isMurajaDue = evaluatedTypes.includes("MURAJA");

    const hifzPlan = hifzPlanId 
      ? await db.query.hifzPlans.findFirst({ where: eq(hifzPlans.id, hifzPlanId) })
      : null;

    const murajaPlan = murajaPlanId
      ? await db.query.weeklyMurajaPlans.findFirst({ where: eq(weeklyMurajaPlans.id, murajaPlanId) })
      : null;

    const murajaLogs = (isMurajaDue && murajaPlan)
      ? await db.query.dailyMurajaLogs.findMany({
          where: and(eq(dailyMurajaLogs.planId, murajaPlan.id), gte(dailyMurajaLogs.date, weekStartDate)),
        })
      : [];

    const hifzLogsList = (isHifzDue && hifzPlan)
      ? await db.query.hifzLogs.findMany({
          where: and(eq(hifzLogs.userId, userId), eq(hifzLogs.hifzPlanId, hifzPlan.id), gte(hifzLogs.date, weekStartDate)),
        })
      : [];

    const currentHifzTarget = hifzPlan?.pagesPerDay || 1;
    const currentMurajaTarget = murajaPlan?.plannedPagesPerDay || 2;

    const calcStats = (logs: any[], dailyTarget: number, pageField: string, planStartStr?: string | null, selectedDaysStr?: string | null) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const windowStart = new Date(weekStartDate);
      windowStart.setHours(0, 0, 0, 0);
      
      const planStart = planStartStr ? new Date(planStartStr) : windowStart;
      planStart.setHours(0, 0, 0, 0);
      
      const effectiveStart = planStart > windowStart ? planStart : windowStart;
      
      let selectedDays: number[] = [0,1,2,3,4,5,6];
      if (selectedDaysStr) {
        try {
          selectedDays = JSON.parse(selectedDaysStr);
        } catch (e) {}
      }
      
      let expectedDays = 0;
      let curr = new Date(effectiveStart);
      while (curr <= today) {
        if (selectedDays.includes(curr.getDay())) {
          expectedDays++;
        }
        curr.setDate(curr.getDate() + 1);
      }
      
      if (expectedDays === 0) expectedDays = 1;

      const totalExpected = dailyTarget * expectedDays;
      const totalDone = logs.reduce((acc, log) => acc + (log[pageField] || 0), 0);
      const rate = (totalDone / totalExpected) * 100;
      
      const completedCount = logs.filter(l => l.status === 'completed').length;
      const partialCount = logs.filter(l => l.status === 'partial').length;
      
      const scores = logs.map(l => l.qualityScore || 0).filter(q => q > 0);
      const quality = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
      return { 
        rate: Math.min(100, rate), 
        quality,
        completedCount,
        partialCount
      };
    };

    const hifzStats = calcStats(hifzLogsList, currentHifzTarget, 'actualPagesCompleted', hifzPlan?.startDate, hifzPlan?.selectedDays);
    const murajaStats = calcStats(murajaLogs, currentMurajaTarget, 'completedPages', murajaPlan?.weekStartDate, murajaPlan?.selectedDays);

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

    const getCombinedScore = (rate: number, testScore: number | undefined, quality: number) => {
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
    let recommendation = "Your consistency was stable this week. Let's keep the same pace and focus on retention.";
    let priorityMatrix: "Elite" | "Polishing" | "Focus" | "Reinforcement" = "Polishing";

    if (isHifzDue && isMurajaDue) {
        if (isMurajaGood && !isHifzGood) {
            suggestedHifz = Math.max(1, currentHifzTarget - 1);
            status = "Polishing";
            priorityMatrix = "Focus";
            finalRule = "case_1_reduce_hifz";
            recommendation = "Revision is solid, but Hifz was a bit difficult. Reducing load to ensure better memorization.";
        } else if (!isMurajaGood && isHifzGood) {
            suggestedHifz = Math.max(1, Math.floor(currentHifzTarget * 0.5));
            suggestedMuraja = currentMurajaTarget + 1;
            status = "Recovery";
            priorityMatrix = "Reinforcement";
            finalRule = "case_2_prioritize_muraja";
            recommendation = "Revision needs more attention. Cutting Hifz load temporarily to help you stabilize previous pages.";
        } else if (!isMurajaGood && !isHifzGood) {
            suggestedHifz = Math.max(1, currentHifzTarget - 1);
            suggestedMuraja = Math.max(1, currentMurajaTarget - 1);
            status = "Recovery";
            priorityMatrix = "Reinforcement";
            finalRule = "case_3_recovery_mode";
            recommendation = "Both Hifz and Muraja were difficult this week. Let's reduce both targets to rebuild your consistency.";
        } else if (isMurajaGood && isHifzGood) {
            suggestedHifz = currentHifzTarget + 1;
            status = "Elite";
            priorityMatrix = "Elite";
            finalRule = "case_4_progression";
            recommendation = "Excellent performance across the board! Increasing Hifz load slightly to maintain your momentum.";
        }
    } 
    else if (isHifzDue) {
        if (isHifzGood) {
            suggestedHifz = currentHifzTarget + 1;
            status = "Elite";
            priorityMatrix = "Elite";
            recommendation = "Great job with your Hifz this week! Increasing your target to match your pace.";
        } else {
            suggestedHifz = Math.max(1, currentHifzTarget - 1);
            status = hifzStats.rate < 40 ? "Recovery" : "Polishing";
            priorityMatrix = "Reinforcement";
            recommendation = "Memorizing new pages felt difficult this week. Let's reduce the load to prioritize quality.";
        }
    } 
    else if (isMurajaDue) {
        if (isMurajaGood) {
            suggestedMuraja = currentMurajaTarget + 1;
            status = "Elite";
            priorityMatrix = "Elite";
            recommendation = "Your revision consistency is outstanding. Increasing daily Muraja to strengthen your memory faster.";
        } else {
            suggestedMuraja = Math.max(1, currentMurajaTarget - 1);
            status = murajaStats.rate < 40 ? "Recovery" : "Polishing";
            priorityMatrix = "Reinforcement";
            recommendation = "Revision goals were hard to meet. Reducing the daily target to help you get back on track.";
        }
    }

   
    if (suggestedHifz > currentHifzTarget + 1) suggestedHifz = currentHifzTarget + 1;
    if (suggestedMuraja > currentMurajaTarget + 1) suggestedMuraja = currentMurajaTarget + 1;

    const applySafeDecrease = (suggested: number, current: number) => {
        const absoluteMin = 1;
        if (suggested < current) {
            const fiftyPercent = Math.floor(current * 0.5);
            const minusTwo = current - 2;
            const maxAllowedDecrease = Math.max(fiftyPercent, minusTwo);
            return Math.max(absoluteMin, Math.max(suggested, maxAllowedDecrease));
        }
        return Math.max(absoluteMin, suggested);
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
      suggestedHifzTarget: Math.round(suggestedHifz),
      suggestedMurajaTarget: Math.round(suggestedMuraja),
      finalRule,
      evaluatedTypes,
      avgRate,
      avgQuality,
      hifzCompletedDays: hifzStats.completedCount,
      hifzPartialDays: hifzStats.partialCount,
      murajaCompletedDays: murajaStats.completedCount,
      murajaPartialDays: murajaStats.partialCount,
      priorityMatrix
    };
  },

  async generateReportHash(report: WeeklyPerformanceReport, isFinal: boolean) {
    const input = JSON.stringify({
      isFinal,
      hifzCompletion: report.hifzCompletion,
      murajaCompletion: report.murajaCompletion,
      hifzTestScore: report.hifzTestScore,
      murajaTestScore: report.murajaTestScore,
      suggestedHifz: report.suggestedHifzTarget,
      suggestedMuraja: report.suggestedMurajaTarget,
      status: report.status,
      types: report.evaluatedTypes,
      hifzStats: {
        perfect: report.hifzCompletedDays,
        partial: report.hifzPartialDays,
      },
      murajaStats: {
        perfect: report.murajaCompletedDays,
        partial: report.murajaPartialDays,
      }
    });
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
  },

  async checkCachedMessage(userId: string, report: WeeklyPerformanceReport, isFinal: boolean) {
    const db = getStateDb();
    const hash = await this.generateReportHash(report, isFinal);
    const cached = await habitProgressService.getCachedGuidance(db, userId);
    if (cached && cached.activityHash === hash) {
      try {
        const payload = JSON.parse(cached.payload);
        return payload.message as string;
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  async getCoachMessage(userId: string, report: WeeklyPerformanceReport, isFinal: boolean) {
    const db = getStateDb();
    const hash = await this.generateReportHash(report, isFinal);
    
    // Check cache first
    const cachedMsg = await this.checkCachedMessage(userId, report, isFinal);
    if (cachedMsg) return cachedMsg;

    const { evaluatedTypes, status, recommendation } = report;
    const safeTypes = Array.isArray(evaluatedTypes) ? evaluatedTypes : [];
    const typesString = safeTypes.length > 0 ? safeTypes.join(" and ") : "Quran Plan";
    
    const isHifzEvaluated = safeTypes.includes("HIFZ");
    const isMurajaEvaluated = safeTypes.includes("MURAJA");

    const summary: any = {
      type: safeTypes.length === 1 ? safeTypes[0] : (safeTypes.length > 1 ? 'MIXED' : 'GENERAL'),
      isFinalEvaluation: isFinal,
      mentorContext: isFinal 
        ? `FINAL CONSULTATION for [${typesString}]: Explain the [${status}] path transition. Rationale for adjustment: ${recommendation}. Be a strategic mentor, focus ONLY on the ${typesString} plan(s) evaluated. Do not mention other types. Explain why this adjustment helps their Quranic journey.` 
        : `PRELIMINARY ANALYSIS for [${typesString}]: The user has completed ${report.avgRate.toFixed(0)}% so far. Do NOT give final targets yet. Comment on their effort vs quality in ${typesString}, and challenge them for the upcoming exam.`,
    };

    if (isHifzEvaluated) {
      summary.hifzCompletion = report.hifzCompletion;
      summary.hifzTestScore = report.hifzTestScore;
      summary.hifzStats = {
        perfectDays: report.hifzCompletedDays,
        partialDays: report.hifzPartialDays,
      };
    }
    if (isMurajaEvaluated) {
      summary.murajaCompletion = report.murajaCompletion;
      summary.murajaTestScore = report.murajaTestScore;
      summary.murajaStats = {
        perfectDays: report.murajaCompletedDays,
        partialDays: report.murajaPartialDays,
      };
    }

    const suggestion = {
      status,
      recommendation,
      newTargets: {
        hifz: isHifzEvaluated ? report.suggestedHifzTarget : undefined,
        muraja: isMurajaEvaluated ? report.suggestedMurajaTarget : undefined,
      }
    };

    const msg = await explainPlan(summary, suggestion);

    await habitProgressService.upsertCachedGuidance(db, {
      userId,
      activityHash: hash,
      data: { message: msg }
    });

    return msg;
  },

  async applyRecommendation(
    userId: string, 
    hifzTarget: number,
    murajaTarget: number,
    evaluatedTypes: ("HIFZ" | "MURAJA")[]
  ) {
    const db = getStateDb();
    await db.transaction(async (tx) => {
      if (evaluatedTypes.includes("HIFZ")) {
        await tx.update(hifzPlans)
          .set({ pagesPerDay: hifzTarget, syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
      }

      if (evaluatedTypes.includes("MURAJA")) {
        const plan = await tx.query.weeklyMurajaPlans.findFirst({
          where: eq(weeklyMurajaPlans.userId, userId)
        });
        
        const stats = await tx.query.userStats.findFirst({
          where: eq(userStats.userId, userId)
        });

        if (plan) {
          const remainingPages = (plan.endPage ?? 0) - (stats?.murajaLastPage ?? 0);
          const daysNeeded = Math.ceil(remainingPages / Math.max(1, murajaTarget));
          
          const newEndDate = new Date();
          newEndDate.setDate(newEndDate.getDate() + daysNeeded);
          const newEndDateStr = newEndDate.toISOString().slice(0, 10);

          await tx.update(weeklyMurajaPlans)
            .set({ 
              plannedPagesPerDay: murajaTarget, 
              weekEndDate: newEndDateStr,
              syncStatus: 0 
            })
            .where(eq(weeklyMurajaPlans.userId, userId));
        }
      }
    });
  }
};
