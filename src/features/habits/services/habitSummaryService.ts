import { db } from "@/src/lib/db/local-client";
import { weeklySummarySeen, activityPlans } from "../database/habitSchema";
import { and, eq } from "drizzle-orm";


export interface DuePlanInfo {
  id: number;
  activityType: 'HIFZ' | 'MURAJA' | 'NORMAL_READING';
  localRefId: number | null;
}

export const habitSummaryService = {
  
 
  async getDueEvaluationPlans(userId: string, now = new Date()): Promise<DuePlanInfo[]> {
    const activePlans = await db.query.activityPlans.findMany({
      where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, 'active')),
      orderBy: (plans, { desc }) => [desc(plans.startDate)]
    });

    if (activePlans.length === 0) return [];

    const todayDayOfWeek = (now.getDay() + 6) % 7;

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    const duePlans: DuePlanInfo[] = [];

    for (const plan of activePlans) {
      const planStart = plan.startDate ? new Date(plan.startDate) : null;
      if (planStart) {
        const diffTime = now.getTime() - planStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 3) continue;
      }

      const targetEvalDay = plan.evaluationDay ?? 6;
      if (todayDayOfWeek === targetEvalDay) {
        const weekKey = `plan-${plan.id}-eval-${dateKey}`;
        const result = await db.query.weeklySummarySeen.findFirst({
          where: and(eq(weeklySummarySeen.userId, userId), eq(weeklySummarySeen.weekKey, weekKey)),
        });
        if (!result) {
            duePlans.push({
              id: plan.id,
              activityType: plan.activityType as any,
              localRefId: plan.localRefId
            });
        }
      }
    }

    return duePlans;
  },

  async shouldShowWeeklySummary(userId: string, now = new Date()): Promise<boolean> {
    const due = await this.getDueEvaluationPlans(userId, now);
    return due.length > 0;
  },


  async markWeeklySummarySeen(userId: string, now = new Date()) {
    const activePlans = await db.query.activityPlans.findMany({
      where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, 'active')),
    });

    const todayDayOfWeek = (now.getDay() + 6) % 7;

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    for (const plan of activePlans) {
        const targetEvalDay = plan.evaluationDay ?? 6;
        if (todayDayOfWeek === targetEvalDay) {
            const weekKey = `plan-${plan.id}-eval-${dateKey}`;
            await db.insert(weeklySummarySeen)
                .values({ userId, weekKey })
                .onConflictDoNothing();
        }
    }
  }
};
