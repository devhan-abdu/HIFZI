
import { PerformanceService } from "@/src/services/PerformanceService";
import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { pagePerformance, userStats } from "@/src/features/user/database/userSchema";
import { eq, and, sql } from "drizzle-orm";
import { ISurah } from "@/src/types";

import { weeklyMurajaPlans, dailyMurajaLogs } from "@/src/features/muraja/database/murajaSchema";
import { activityPlans, weeklySummarySeen, activityLogs } from "@/src/features/habits/database/habitSchema";
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
  await db.delete(pageActivityLogs).where(eq(pageActivityLogs.userId, userId));
  await db.delete(pagePerformance).where(eq(pagePerformance.userId, userId));
  await db.delete(userStats).where(eq(userStats.userId, userId));
  await db.delete(testLogs).where(eq(testLogs.userId, userId));
}

export async function runHifzSeedingScenario(
    userId: string,
    surahData: ISurah[],
    scenario: "perfect_user" | "inconsistent_user" | "skip_heavy_user" | "adaptive_test" | "hifz_only" | "muraja_only" | "strong_hifz_good_muraja"
) {
  console.log(`[Seeding] Running Scenario: ${scenario}`);
  
  await clearTestData(userId);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);

  const today = new Date();
  const evaluationDay = today.getDay();

  // 1. Create Hifz Plan (if not muraja_only)
  let plan: any = null;
  if (scenario !== "muraja_only") {
    const planPayload = {
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
    };

    [plan] = await db.insert(hifzPlans).values(planPayload as any).returning();

    let currentPage = 1;

    for (let day = 0; day < 14; day++) {
      const logDate = new Date(startDate);
      logDate.setDate(startDate.getDate() + day);
      const logDateStr = logDate.toISOString().split('T')[0];

      let status: "completed" | "partial" | "skipped" = "completed";
      const rand = (day * 13) % 100;

      if (scenario === "perfect_user" || scenario === "strong_hifz_good_muraja") {
        status = "completed";
      } else if (scenario === "inconsistent_user") {
        if (rand < 70) status = "completed";
        else if (rand < 90) status = "partial";
        else status = "skipped";
      } else if (scenario === "skip_heavy_user") {
        if (rand < 40) status = "completed";
        else if (rand < 70) status = "partial";
        else status = "skipped";
      } else if (scenario === "adaptive_test" || scenario === "hifz_only") {
        // 50% completion to trigger "Bad" status in matrix
        if (rand < 50) status = "completed";
        else if (rand < 80) status = "partial";
        else status = "skipped";
      }

      if (status === "skipped") continue;

      const pagesToComplete = status === "completed" ? 3 : (rand % 2 === 0 ? 1 : 2);
      const startPage = currentPage;
      const endPage = Math.min(604, currentPage + pagesToComplete - 1);
      
      const [hLog] = await db.insert(hifzLogs).values({
        userId,
        hifzPlanId: plan.id,
        actualStartPage: startPage,
        actualEndPage: endPage,
        actualPagesCompleted: pagesToComplete,
        date: logDateStr,
        logDay: day,
        status: status,
        qualityScore: status === "completed" ? 5 : 3,
      } as any).returning();

      for (let p = startPage; p <= endPage; p++) {
        await db.insert(pageActivityLogs).values({
          userId,
          pageId: p,
          source: 'hifz',
          localLogId: hLog.id,
          logDate: logDateStr,
          sessionQuality: status === "completed" ? 'perfect' : 'medium',
          mistakesCount: status === "completed" ? 0 : 2,
        });
      }

      // DASHBOARD SYNC: Insert activityLogs for the dashboard heatmap/stats
      await db.insert(activityLogs).values({
        userId,
        date: logDateStr,
        activityType: 'HIFZ',
        unitsCompleted: pagesToComplete,
        minutesSpent: 15,
        status: status === "completed" ? 'completed' : 'partial',
        localRefId: hLog.id,
        metadata: JSON.stringify({ eventType: 'HIFZ_COMPLETED' })
      } as any);
      
      currentPage = endPage + 1;
    }

    await db.insert(userStats).values({
      userId,
      hifzLastPage: currentPage - 1,
      totalXp: 500,
      level: 1,
    } as any).onConflictDoUpdate({
      target: [userStats.userId],
      set: { hifzLastPage: currentPage - 1 }
    });

    // 3. Create Activity Plan for Hifz (required for trigger)
    await db.insert(activityPlans).values({
      userId,
      activityType: 'HIFZ',
      status: 'active',
      evaluationDay: evaluationDay,
      startDate: startDate.toISOString().split('T')[0],
      localRefId: plan.id,
    });
  }

  // 4. Create Muraja Plan if adaptive_test, muraja_only, or strong_hifz_good_muraja
  if (scenario === "adaptive_test" || scenario === "muraja_only" || scenario === "strong_hifz_good_muraja") {
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

      let currentMurajaPage = 1;
      // Seed 14 days of Muraja logs
      for (let day = 0; day < 14; day++) {
          const logDate = new Date(startDate);
          logDate.setDate(startDate.getDate() + day);
          const logDateStr = logDate.toISOString().split('T')[0];
          
          // To make the heatmap "Green" (Gold), we repeat the SAME pages multiple times
          // Pages 1-10 will have several perfect sessions, increasing stability.
          const startPage = (day % 2 === 0) ? 1 : 6;
          const endPage = startPage + 4;

          // Make Muraja "Perfect" to test the Muraja-Good/Hifz-Bad case of Priority Matrix
          const [mLog] = await db.insert(dailyMurajaLogs).values({
              planId: mPlan.id,
              date: logDateStr,
              startPage: startPage,
              completedPages: 5,
              status: 'completed',
              qualityScore: 5,
          } as any).returning();

          // CRITICAL: Insert pageActivityLogs for Muraja so they show up in heatmap
          for (let p = startPage; p <= endPage; p++) {
            await db.insert(pageActivityLogs).values({
                userId,
                pageId: p,
                source: 'muraja',
                localLogId: mLog.id,
                logDate: logDateStr,
                sessionQuality: 'perfect',
                mistakesCount: 0,
            });
          }

          // DASHBOARD SYNC: Insert activityLogs for the dashboard heatmap/stats
          await db.insert(activityLogs).values({
            userId,
            date: logDateStr,
            activityType: 'MURAJA',
            unitsCompleted: 5,
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
  }

  // Recompute Performance
  await db.transaction(async (tx) => {
    // Ensure stats exist for recomputation logic (hifzLastPage check)
    const existingStats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
    if (!existingStats) {
        await tx.insert(userStats).values({ userId, totalXp: 0, level: 1, hifzLastPage: 0 });
    }
    
    await PerformanceService.recomputeAllPerformance(tx, userId);
  });

  // Force one overdue page for testing
  await db.update(pagePerformance)
    .set({ nextReviewAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() })
    .where(and(eq(pagePerformance.userId, userId), eq(pagePerformance.pageNumber, 1)));

  console.log("[Seeding] Complete.");
}
