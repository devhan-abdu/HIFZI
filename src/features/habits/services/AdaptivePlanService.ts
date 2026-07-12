import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "../../hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "../../muraja/database/murajaSchema";
import { testLogs } from "../../test/database/testSchema";
import { explainPlan } from "../../ai/services/quranAI";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { activityPlans, weeklySummarySeen } from "../../habits/database/habitSchema";
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
  windowCompletedPages: number;
  windowMissedDays: number;
  hifzTotalCompletedPages: number;
  murajaTotalCompletedPages: number;
  hifzMissedDays: number;
  murajaMissedDays: number;
  hifzAdaptiveSuggestion?: {
    action: 'pause' | 'half';
    currentHifzTarget: number;
    suggestedHifzTarget: number;
    message: string;
  };
}

export const AdaptivePlanService = {

  async evaluateWeeklyPerformance(
    userId: string,
    weekStartDate: string,
    duePlanIds: number[] = []
  ): Promise<WeeklyPerformanceReport> {
    const plans = duePlanIds.length > 0
      ? await db.query.activityPlans.findMany({
          where: and(
            eq(activityPlans.userId, userId),
            eq(activityPlans.status, "active"),
            inArray(activityPlans.localRefId, duePlanIds),
          ),
        })
      : await db.query.activityPlans.findMany({
          where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, "active")),
        });

    const hifzActivityPlanId = plans.find(p => p.activityType === 'HIFZ')?.id;
    const murajaActivityPlanId = plans.find(p => p.activityType === 'MURAJA')?.id;
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

    const getLastEvalDate = async (activityPlanId: number, planStartDate: string) => {
      const records = await db.query.weeklySummarySeen.findMany({
        where: eq(weeklySummarySeen.userId, userId),
      });
      const planRecords = records.filter(r => r.weekKey.startsWith(`plan-${activityPlanId}-eval-`));
      if (planRecords.length === 0) {
        return planStartDate;
      }
      planRecords.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest = planRecords[0];
      const match = latest.weekKey.match(/eval-(\d{4}-\d{2}-\d{2})/);
      if (match && match[1]) {
        return match[1];
      }
      return latest.createdAt.slice(0, 10);
    };

    const murajaStartSearchDate = murajaPlan 
      ? await getLastEvalDate(murajaActivityPlanId ?? murajaPlan.id, murajaPlan.startDate || weekStartDate)
      : weekStartDate;

    const hifzStartSearchDate = hifzPlan
      ? await getLastEvalDate(hifzActivityPlanId ?? hifzPlan.id, hifzPlan.startDate || weekStartDate)
      : weekStartDate;

    const murajaLogs = (isMurajaDue && murajaPlan)
      ? await db.query.dailyMurajaLogs.findMany({
          where: and(eq(dailyMurajaLogs.planId, murajaPlan.id), gte(dailyMurajaLogs.date, murajaStartSearchDate)),
        })
      : [];

    const hifzLogsList = (isHifzDue && hifzPlan)
      ? await db.query.hifzLogs.findMany({
          where: and(eq(hifzLogs.userId, userId), eq(hifzLogs.hifzPlanId, hifzPlan.id), gte(hifzLogs.date, hifzStartSearchDate)),
        })
      : [];

    const currentHifzTarget = Math.round(hifzPlan?.pagesPerDay || 1);
    const currentMurajaTarget = Math.round(murajaPlan?.plannedPagesPerDay || 2);

    const calcStats = (
      logs: any[], 
      dailyTarget: number, 
      pageField: string, 
      planStartStr: string, 
      selectedDaysStr?: string | null
    ) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const windowStart = new Date(planStartStr);
      windowStart.setHours(0, 0, 0, 0);
      
      let selectedDays: number[] = [0,1,2,3,4,5,6];
      if (selectedDaysStr) {
        try {
          selectedDays = JSON.parse(selectedDaysStr);
        } catch {}
      }
      
      let expectedDays = 0;
      let curr = new Date(windowStart);
      while (curr <= today) {
        const dayIndex = (curr.getDay() + 6) % 7;
        if (selectedDays.includes(dayIndex)) {
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
      
      const activeDays = logs.filter(l => l.status === 'completed' || l.status === 'partial').length;
      const missedDays = Math.max(0, expectedDays - activeDays);

      return { 
        rate: Math.min(100, rate), 
        quality,
        completedCount,
        partialCount,
        totalDone,
        missedDays
      };
    };

    const hifzStats = calcStats(hifzLogsList, currentHifzTarget, 'actualPagesCompleted', hifzStartSearchDate, hifzPlan?.selectedDays);
    const murajaStats = calcStats(murajaLogs, currentMurajaTarget, 'completedPages', murajaStartSearchDate, murajaPlan?.selectedDays);

    const windowCompletedPages = (isHifzDue ? hifzStats.totalDone : 0) + (isMurajaDue ? murajaStats.totalDone : 0);
    const windowMissedDays = Math.max(
      isHifzDue ? hifzStats.missedDays : 0,
      isMurajaDue ? murajaStats.missedDays : 0
    );

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

    const testSearchStartDate = [weekStartDate, hifzStartSearchDate, murajaStartSearchDate]
      .filter((value): value is string => !!value)
      .sort()[0] ?? weekStartDate;

    const tests = await db.query.testLogs.findMany({
      where: and(eq(testLogs.userId, userId), gte(testLogs.date, testSearchStartDate)),
      orderBy: [desc(testLogs.date)]
    });

    const parsePagesRange = (pagesRange: string) => {
      try {
        const parsed = JSON.parse(pagesRange);
        return Array.isArray(parsed)
          ? parsed.map((page) => Number(page)).filter((page) => Number.isFinite(page)).sort((a, b) => a - b)
          : [];
      } catch {
        return [];
      }
    };

    const hasMatchingPages = (pagesRange: string, pages: number[]) => {
      const parsed = parsePagesRange(pagesRange);
      const normalizedPages = [...pages].sort((a, b) => a - b);
      return parsed.length === normalizedPages.length && parsed.every((page, index) => page === normalizedPages[index]);
    };

    const hifzTest = hifzTestPages.length > 0
      ? tests.find(t => t.type === 'HIFZ' && hasMatchingPages(t.pagesRange, hifzTestPages))
      : undefined;
    const murajaTest = murajaTestPages.length > 0
      ? tests.find(t => t.type === 'MURAJA' && hasMatchingPages(t.pagesRange, murajaTestPages))
      : undefined;

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

    const getSuggestedTarget = (current: number, isDue: boolean, isGood: boolean, stats: { rate: number }) => {
        if (!isDue) return current;
        if (isGood) {
            return current + 1;
        } else {
            if (stats.rate < 30) {
                return Math.max(1, Math.round(current * 0.5));
            } else if (stats.rate < 60) {
                return Math.max(1, Math.round(current * 0.7));
            } else {
                return Math.max(1, Math.min(current - 1, Math.round(current * 0.85)));
            }
        }
    };

    let hifzAdaptiveSuggestion: any = undefined;

    if (isHifzDue && isMurajaDue) {
        if (isMurajaGood && !isHifzGood) {
            suggestedHifz = getSuggestedTarget(currentHifzTarget, true, false, hifzStats);
            status = "Polishing";
            priorityMatrix = "Focus";
            finalRule = "case_1_reduce_hifz";
            recommendation = "Masha'Allah! Your revision is rock-solid. However, new memorization felt a bit heavy. We have slightly reduced your Hifz target so you can master each new page with ease and confidence.";
        } else if (!isMurajaGood && isHifzGood) {
            if (murajaStats.rate < 40) {
                suggestedHifz = 0; 
                recommendation = "Your memorization speed is excellent! However, revision is the protective shield of the Quran in your heart. We have temporarily paused new Hifz so you can focus 100% on stabilizing your previous pages.";
            } else {
                suggestedHifz = Math.max(1, Math.round(currentHifzTarget * 0.5));
                recommendation = "Masha'Allah! You are memorizing well, but revision needs a bit more care. We have cut your Hifz target by half to give you ample breathing room to solidify your past pages.";
            }
            suggestedMuraja = getSuggestedTarget(currentMurajaTarget, true, false, murajaStats);
            status = "Recovery";
            priorityMatrix = "Reinforcement";
            finalRule = "case_2_prioritize_muraja";
        } else if (!isMurajaGood && !isHifzGood) {
            suggestedHifz = 0;
            suggestedMuraja = Math.max(1, Math.round(currentMurajaTarget * 0.5)); 
            status = "Recovery";
            priorityMatrix = "Reinforcement";
            finalRule = "case_3_recovery_mode";
            recommendation = "To protect your motivation and rebuild your consistency, we have cleared your plate: new Hifz is paused, and Revision targets are cut in half. Let's focus on easy, small wins this week and rebuild your daily streak!";
        } else if (isMurajaGood && isHifzGood) {
            suggestedHifz = currentHifzTarget + 1;
            suggestedMuraja = currentMurajaTarget + 1;
            status = "Elite";
            priorityMatrix = "Elite";
            finalRule = "case_4_progression";
            recommendation = "Masha'Allah, TabarakAllah! Elite consistency across the board! Your memory is sharp and your revision is solid. We have slightly increased both targets to match your beautiful momentum.";
        }
    } 
    else if (isHifzDue) {
        suggestedHifz = getSuggestedTarget(currentHifzTarget, true, isHifzGood, hifzStats);
        if (isHifzGood) {
            status = "Elite";
            priorityMatrix = "Elite";
            recommendation = "Masha'Allah! Outstanding memorization this week! We have slightly increased your target to keep pace with your high momentum.";
        } else {
            status = hifzStats.rate < 40 ? "Recovery" : "Polishing";
            priorityMatrix = "Reinforcement";
            recommendation = "Memorizing new pages felt a bit challenging this week. We have adjusted your target downward to ensure you can memorize each page with perfection.";
        }
    } 
    else if (isMurajaDue) {
        suggestedMuraja = getSuggestedTarget(currentMurajaTarget, true, isMurajaGood, murajaStats);
        if (isMurajaGood) {
            status = "Elite";
            priorityMatrix = "Elite";
            recommendation = "Masha'Allah! Your revision consistency is absolutely stellar. We have slightly increased your target to strengthen your memory faster.";
        } else {
            status = murajaStats.rate < 40 ? "Recovery" : "Polishing";
            priorityMatrix = "Reinforcement";
            recommendation = "Meeting your revision goals was a bit hard this week. We have reduced your target to help you get back on track and feel victorious every day.";

            // Cross-plan adaptive check: If they are failing Muraja, we must check if they have an active Hifz plan
            const activeHifz = await db.query.hifzPlans.findFirst({
                where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active'))
            });
            if (activeHifz) {
                const currentHifz = Math.round(activeHifz.pagesPerDay);
                if (murajaStats.rate < 30) {
                    hifzAdaptiveSuggestion = {
                        action: 'pause',
                        currentHifzTarget: currentHifz,
                        suggestedHifzTarget: 0,
                        message: "Your revision (Muraja) was severely struggling this week (under 30%). To protect your retention and prevent cognitive overload, we highly recommend pausing new memorization temporarily so you can focus 100% on recovery."
                    };
                    suggestedHifz = 0;
                } else if (murajaStats.rate < 60) {
                    hifzAdaptiveSuggestion = {
                        action: 'half',
                        currentHifzTarget: currentHifz,
                        suggestedHifzTarget: Math.max(1, Math.round(currentHifz * 0.5)),
                        message: "Your revision (Muraja) consistency needs a bit more care. We recommend cutting your Hifz target in half temporarily to give you ample breathing room to solidify your previous pages."
                    };
                    suggestedHifz = hifzAdaptiveSuggestion.suggestedHifzTarget;
                }
            }
        }
    }

    if (suggestedHifz > currentHifzTarget + 1) suggestedHifz = currentHifzTarget + 1;
    if (suggestedMuraja > currentMurajaTarget + 1) suggestedMuraja = currentMurajaTarget + 1;

    const applySafeDecrease = (suggested: number, current: number) => {
        if (suggested === 0) return 0; 
        const absoluteMin = 1;
        if (suggested < current) {
            const fiftyPercent = Math.round(current * 0.5);
            return Math.max(absoluteMin, Math.max(Math.round(suggested), fiftyPercent));
        }
        return Math.max(absoluteMin, Math.round(suggested));
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
      priorityMatrix,
      windowCompletedPages,
      windowMissedDays,
      hifzTotalCompletedPages: hifzStats.totalDone,
      murajaTotalCompletedPages: murajaStats.totalDone,
      hifzMissedDays: hifzStats.missedDays,
      murajaMissedDays: murajaStats.missedDays,
      hifzAdaptiveSuggestion
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
    const hash = await this.generateReportHash(report, isFinal);
    const cached = await habitProgressService.getCachedGuidance(db, userId);
    if (cached && cached.activityHash === hash) {
      try {
        const payload = JSON.parse(cached.payload);
        return payload.message as string;
      } catch {
        return null;
      }
    }
    return null;
  },

  async getCoachMessage(userId: string, report: WeeklyPerformanceReport, isFinal: boolean) {
    const hash = await this.generateReportHash(report, isFinal);
    
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
    evaluatedTypes: ("HIFZ" | "MURAJA")[],
    evaluatedPlanIds: number[] = []
  ) {
    await db.transaction(async (tx) => {
      if (evaluatedTypes.includes("HIFZ")) {
        await tx.update(hifzPlans)
          .set({ pagesPerDay: hifzTarget, syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));
      } else if (evaluatedTypes.includes("MURAJA") && hifzTarget !== undefined) {
        // Apply Hifz target adjustment from cross-plan struggle recommendation
        const activeHifz = await tx.query.hifzPlans.findFirst({
          where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active'))
        });
        if (activeHifz && Math.round(activeHifz.pagesPerDay) !== hifzTarget) {
          await tx.update(hifzPlans)
            .set({ pagesPerDay: hifzTarget, syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(hifzPlans.id, activeHifz.id));
        }
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
          const selectedDaysRaw = plan.selectedDays ?? [];
          const parsedDays = typeof selectedDaysRaw === "string"
            ? JSON.parse(selectedDaysRaw)
            : selectedDaysRaw;
          const weeklyFreq = parsedDays?.length || 7;
          const dailyRate = Math.max(1, murajaTarget);
          const sessionNeeded = Math.ceil(remainingPages / dailyRate);
          let daysNeeded = 1;
          if (sessionNeeded > 1) {
            daysNeeded = Math.ceil(((sessionNeeded - 1) / weeklyFreq) * 7) + 1;
          }
          
          const newEndDate = new Date();
          newEndDate.setDate(newEndDate.getDate() + (daysNeeded - 1));
          const newEndDateStr = newEndDate.toISOString().slice(0, 10);

          await tx.update(weeklyMurajaPlans)
            .set({ 
              plannedPagesPerDay: murajaTarget, 
              endDate: newEndDateStr,
              syncStatus: 0 
            })
            .where(eq(weeklyMurajaPlans.userId, userId));
        }
      }

      if (evaluatedPlanIds.length > 0) {
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10);

        for (const planId of evaluatedPlanIds) {
          await tx.insert(weeklySummarySeen)
            .values({ userId, weekKey: `plan-${planId}-eval-${dateKey}` })
            .onConflictDoNothing();
        }
      }
    });
  }
};
