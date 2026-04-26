import { db } from "@/src/lib/db/local-client";
import { weeklySummarySeen, activityPlans } from "../database/habitSchema";
import { and, eq } from "drizzle-orm";


export const habitSummaryService = {
  
 
  async shouldShowWeeklySummary(userId: string, now = new Date()): Promise<boolean> {
    const activePlan = await db.query.activityPlans.findFirst({
      where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, 'active')),
      orderBy: (plans, { desc }) => [desc(plans.startDate)]
    });

    if (!activePlan?.startDate) return false;

    const startDate = new Date(activePlan.startDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const isNewWeekDay = diffDays > 0 && diffDays % 7 === 0;
    if (!isNewWeekDay) return false;

    const weekNumber = Math.floor(diffDays / 7);
    const weekKey = `plan-${activePlan.id}-week-${weekNumber}`;

    const result = await db.query.weeklySummarySeen.findFirst({
      where: and(eq(weeklySummarySeen.userId, userId), eq(weeklySummarySeen.weekKey, weekKey)),
    });

    return !result;
  },


  async markWeeklySummarySeen(userId: string, now = new Date()) {
    const activePlan = await db.query.activityPlans.findFirst({
      where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, 'active')),
      orderBy: (plans, { desc }) => [desc(plans.startDate)]
    });

    if (!activePlan?.startDate) return;

    const startDate = new Date(activePlan.startDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const weekNumber = Math.floor(diffDays / 7);
    const weekKey = `plan-${activePlan.id}-week-${weekNumber}`;

    await db.insert(weeklySummarySeen)
      .values({ userId, weekKey })
      .onConflictDoNothing();
  }
};
