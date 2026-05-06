
import { PerformanceService } from "@/src/services/PerformanceService";
import { db } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { pagePerformance, userStats } from "@/src/features/user/database/userSchema";
import { eq, and } from "drizzle-orm";
import { ISurah } from "@/src/types";

export async function clearTestData(userId: string) {
  await db.delete(hifzLogs).where(eq(hifzLogs.userId, userId));
  await db.delete(hifzPlans).where(eq(hifzPlans.userId, userId));
  await db.delete(pageActivityLogs).where(eq(pageActivityLogs.userId, userId));
  await db.delete(pagePerformance).where(eq(pagePerformance.userId, userId));
  await db.delete(userStats).where(eq(userStats.userId, userId));
}

export async function runHifzSeedingScenario(
    userId: string,
    surahData: ISurah[],
    scenario: "perfect_user" | "inconsistent_user" | "skip_heavy_user"
) {
  console.log(`[Seeding] Running Scenario: ${scenario}`);
  
  await clearTestData(userId);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);

  // 1. Create Hifz Plan
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
  };

  const [plan] = await db.insert(hifzPlans).values(planPayload as any).returning();

  let currentPage = 1;

  for (let day = 0; day < 14; day++) {
    const logDate = new Date(startDate);
    logDate.setDate(startDate.getDate() + day);
    const logDateStr = logDate.toISOString().split('T')[0];

    let status: "completed" | "partial" | "skipped" = "completed";
    const rand = (day * 13) % 100;

    if (scenario === "perfect_user") {
      status = "completed";
    } else if (scenario === "inconsistent_user") {
      if (rand < 70) status = "completed";
      else if (rand < 90) status = "partial";
      else status = "skipped";
    } else if (scenario === "skip_heavy_user") {
      if (rand < 40) status = "completed";
      else if (rand < 70) status = "partial";
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
    
    currentPage = endPage + 1;
  }

  await db.insert(userStats).values({
    userId,
    hifzLastPage: currentPage - 1,
  } as any).onConflictDoUpdate({
    target: [userStats.userId],
    set: { hifzLastPage: currentPage - 1 }
  });

  // Recompute Performance
  await db.transaction(async (tx) => {
    await PerformanceService.recomputeAllPerformance(tx, userId);
  });

  // Force one overdue page for testing
  await db.update(pagePerformance)
    .set({ nextReviewAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() })
    .where(and(eq(pagePerformance.userId, userId), eq(pagePerformance.pageNumber, 1)));

  console.log("[Seeding] Complete.");
}
