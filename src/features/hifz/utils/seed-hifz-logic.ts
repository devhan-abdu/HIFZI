
import { PerformanceService } from "@/src/services/PerformanceService";
import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { pageActivityLogs, activityPlans, weeklySummarySeen, activityLogs, planAchievements } from "@/src/features/habits/database/habitSchema";
import { pagePerformance, userStats } from "@/src/features/user/database/userSchema";
import { eq, and, sql } from "drizzle-orm";
import { ISurah } from "@/src/types";

import { weeklyMurajaPlans, dailyMurajaLogs } from "@/src/features/muraja/database/murajaSchema";
import { testLogs } from "@/src/features/test/database/testSchema";

export async function clearTestData(userId: string) {
  await db.delete(hifzLogs).where(eq(hifzLogs.userId, userId));
  await db.delete(hifzPlans).where(eq(hifzPlans.userId, userId));
  await db.delete(dailyMurajaLogs).where(
    sql`${dailyMurajaLogs.planId} IN (SELECT id FROM weekly_muraja_plan WHERE user_id = ${userId})`
  );
  await db.delete(weeklyMurajaPlans).where(eq(weeklyMurajaPlans.userId, userId));
  await db.delete(activityPlans).where(eq(activityPlans.userId, userId));
  await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
  await db.delete(weeklySummarySeen).where(eq(weeklySummarySeen.userId, userId));
  await db.delete(planAchievements).where(eq(planAchievements.userId, userId));
  await db.delete(pageActivityLogs).where(eq(pageActivityLogs.userId, userId));
  await db.delete(pagePerformance).where(eq(pagePerformance.userId, userId));
  await db.delete(userStats).where(eq(userStats.userId, userId));
  await db.delete(testLogs).where(eq(testLogs.userId, userId));
}

export async function runHifzSeedingScenario(
    userId: string,
    surahData: ISurah[],
    scenario: "perfect_user" | "inconsistent_user" | "skip_heavy_user" | "adaptive_test" | "hifz_only" | "muraja_only" | "strong_hifz_good_muraja" | "muraja_finished" | "hifz_finished" | "both_finished"
) {
  console.log(`[Seeding] Running Scenario: ${scenario}`);
  
  await clearTestData(userId);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);

  const today = new Date();
  const evaluationDay = (today.getDay() + 6) % 7; 

  // Helper for adding an active (not finished) Hifz plan
  const addActiveHifz = async () => {
    const [hPlan] = await db.insert(hifzPlans).values({
        userId,
        startSurah: 1,
        startPage: 1,
        totalPages: 604,
        pagesPerDay: 3,
        selectedDays: "[0,1,2,3,4,5,6]",
        daysPerWeek: 7,
        startDate: startDate.toISOString().split('T')[0],
        estimatedEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
        direction: 'forward',
        status: 'active',
        isReinforcementEnabled: true,
        evaluationDay: evaluationDay,
    } as any).returning();

    await db.insert(activityPlans).values({
        userId,
        activityType: 'HIFZ',
        status: 'active',
        evaluationDay: evaluationDay,
        startDate: startDate.toISOString().split('T')[0],
        localRefId: hPlan.id,
    });
    return hPlan;
  };

  // Helper for adding an active (not finished) Muraja plan
  const addActiveMuraja = async () => {
      const [mPlan] = await db.insert(weeklyMurajaPlans).values({
          userId,
          weekStartDate: startDate.toISOString().split('T')[0],
          weekEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
          plannedPagesPerDay: 5,
          startPage: 1,
          endPage: 70,
          isActive: true,
          evaluationDay: evaluationDay,
          selectedDays: "[0,1,2,3,4,5,6]",
      }).returning();

      await db.insert(activityPlans).values({
          userId,
          activityType: 'MURAJA',
          status: 'active',
          evaluationDay: evaluationDay,
          startDate: startDate.toISOString().split('T')[0],
          localRefId: mPlan.id,
      });
      return mPlan;
  };

  // Helper for adding a finished Muraja plan
  const addFinishedMuraja = async () => {
      const [mPlan] = await db.insert(weeklyMurajaPlans).values({
          userId,
          weekStartDate: startDate.toISOString().split('T')[0],
          weekEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
          plannedPagesPerDay: 5,
          startPage: 1,
          endPage: 25,
          isActive: true,
          evaluationDay: evaluationDay,
          selectedDays: "[0,1,2,3,4,5,6]",
      }).returning();

      // Seed history that exactly reaches the endPage
      const logs = [
          { start: 1, count: 5 },
          { start: 6, count: 5 },
          { start: 11, count: 5 },
          { start: 16, count: 5 },
          { start: 21, count: 5 }, // Reaches 25
      ];

      for (let i = 0; i < logs.length; i++) {
          const logDate = new Date();
          logDate.setDate(logDate.getDate() - (logs.length - 1 - i));
          const logDateStr = logDate.toISOString().split('T')[0];
          
          const [mLog] = await db.insert(dailyMurajaLogs).values({
              planId: mPlan.id,
              date: logDateStr,
              startPage: logs[i].start,
              completedPages: logs[i].count,
              status: 'completed',
              qualityScore: 5,
          } as any).returning();

          await db.insert(activityLogs).values({
            userId,
            date: logDateStr,
            activityType: 'MURAJA',
            unitsCompleted: logs[i].count,
            minutesSpent: 20,
            status: 'completed',
            localRefId: mLog.id,
            metadata: JSON.stringify({ eventType: 'MURAJA_COMPLETED' })
          } as any);
      }

      await db.insert(activityPlans).values({
          userId,
          activityType: 'MURAJA',
          status: 'active',
          evaluationDay: evaluationDay,
          startDate: startDate.toISOString().split('T')[0],
          localRefId: mPlan.id,
      });
  };

  // Helper for adding a finished Hifz plan
  const addFinishedHifz = async () => {
      const [hPlan] = await db.insert(hifzPlans).values({
        userId,
        startSurah: 1,
        startPage: 1,
        totalPages: 10,
        pagesPerDay: 2,
        selectedDays: "[0,1,2,3,4,5,6]",
        daysPerWeek: 7,
        startDate: startDate.toISOString().split('T')[0],
        estimatedEndDate: today.toISOString().split('T')[0],
        direction: 'forward',
        status: 'active',
        isReinforcementEnabled: true,
        evaluationDay: evaluationDay,
      } as any).returning();

      const logDate = new Date();
      logDate.setDate(logDate.getDate() - 1);
      const logDateStr = logDate.toISOString().split('T')[0];

      await db.insert(hifzLogs).values({
          userId,
          hifzPlanId: hPlan.id,
          actualStartPage: 1,
          actualEndPage: 10,
          actualPagesCompleted: 10,
          date: logDateStr,
          logDay: 1,
          status: 'completed',
          qualityScore: 5,
      } as any);

      await db.insert(activityPlans).values({
          userId,
          activityType: 'HIFZ',
          status: 'active',
          evaluationDay: evaluationDay,
          startDate: startDate.toISOString().split('T')[0],
          localRefId: hPlan.id,
      });
  };

  if (scenario === "muraja_finished") {
      await addActiveHifz();
      await addFinishedMuraja();
  } else if (scenario === "hifz_finished") {
      await addActiveMuraja();
      await addFinishedHifz();
  } else if (scenario === "both_finished") {
      await addFinishedHifz();
      await addFinishedMuraja();
  } else if (scenario === "muraja_only") {
      await addActiveMuraja();
  } else {
    // Complex seeding for other scenarios (Hifz with history)
    const [plan] = await db.insert(hifzPlans).values({
      userId,
      startSurah: 1,
      startPage: 1,
      totalPages: 604,
      pagesPerDay: 3,
      selectedDays: "[0,1,2,3,4,5,6]",
      daysPerWeek: 7,
      startDate: startDate.toISOString().split('T')[0],
      estimatedEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
      direction: 'forward',
      status: 'active',
      isReinforcementEnabled: true,
      evaluationDay: evaluationDay,
    } as any).returning();

    let currentPage = 1;
    for (let day = 0; day < 14; day++) {
      const logDate = new Date(startDate);
      logDate.setDate(startDate.getDate() + day);
      const logDateStr = logDate.toISOString().split('T')[0];
      let status: "completed" | "partial" | "skipped" = "completed";
      const rand = (day * 13) % 100;

      if (scenario === "perfect_user" || scenario === "strong_hifz_good_muraja") status = "completed";
      else if (scenario === "inconsistent_user") status = rand < 70 ? "completed" : (rand < 90 ? "partial" : "skipped");
      else if (scenario === "skip_heavy_user") status = rand < 40 ? "completed" : (rand < 70 ? "partial" : "skipped");
      else if (scenario === "adaptive_test" || scenario === "hifz_only") status = rand < 50 ? "completed" : (rand < 80 ? "partial" : "skipped");

      if (status === "skipped") continue;
      const pagesToComplete = status === "completed" ? 3 : (rand % 2 === 0 ? 1 : 2);
      const startPage = currentPage;
      const endPage = Math.min(604, currentPage + pagesToComplete - 1);
      
      const [hLog] = await db.insert(hifzLogs).values({
        userId, hifzPlanId: plan.id, actualStartPage: startPage, actualEndPage: endPage,
        actualPagesCompleted: pagesToComplete, date: logDateStr, logDay: day, status, qualityScore: status === "completed" ? 5 : 3,
      } as any).returning();

      for (let p = startPage; p <= endPage; p++) {
        await db.insert(pageActivityLogs).values({
          userId, pageId: p, source: 'hifz', localLogId: hLog.id, logDate: logDateStr,
          sessionQuality: status === "completed" ? 'perfect' : 'medium', mistakesCount: status === "completed" ? 0 : 2,
        });
      }
      await db.insert(activityLogs).values({
        userId, date: logDateStr, activityType: 'HIFZ', unitsCompleted: pagesToComplete,
        minutesSpent: 15, status: status === "completed" ? 'completed' : 'partial', localRefId: hLog.id,
        metadata: JSON.stringify({ eventType: 'HIFZ_COMPLETED' })
      } as any);
      currentPage = endPage + 1;
    }

    await db.insert(userStats).values({ userId, hifzLastPage: currentPage - 1, totalXp: 500, level: 1 } as any)
      .onConflictDoUpdate({ target: [userStats.userId], set: { hifzLastPage: currentPage - 1 } });

    await db.insert(activityPlans).values({
      userId, activityType: 'HIFZ', status: 'active', evaluationDay, startDate: startDate.toISOString().split('T')[0], localRefId: plan.id,
    });

    if (scenario === "adaptive_test" || scenario === "strong_hifz_good_muraja") {
        await addActiveMuraja();
    }
  }

  // Recompute Performance
  await db.transaction(async (tx) => {
    const existingStats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
    if (!existingStats) await tx.insert(userStats).values({ userId, totalXp: 0, level: 1, hifzLastPage: 0 });
    await PerformanceService.recomputeAllPerformance(tx, userId);
  });

  await db.update(pagePerformance)
    .set({ nextReviewAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() })
    .where(and(eq(pagePerformance.userId, userId), eq(pagePerformance.pageNumber, 1)));

  console.log("[Seeding] Complete.");
}
