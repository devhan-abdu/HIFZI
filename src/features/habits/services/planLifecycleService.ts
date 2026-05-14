
import { getStateDb } from "@/src/lib/db/local-client";
import { hifzLogs, hifzPlans } from "../../hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "../../muraja/database/murajaSchema";
import { planAchievements, activityPlans } from "../database/habitSchema";
import { and, eq, desc } from "drizzle-orm";
import { checkMurajaCompletion, checkHifzCompletion } from "../utils/planCompletion";

export interface FinishedPlan {
    id: number;
    activityType: 'HIFZ' | 'MURAJA';
    localRefId: number;
    title?: string;
}

export const planLifecycleService = {
  
    async getFinishedPlans(userId: string): Promise<FinishedPlan[]> {
        const db = getStateDb()
        const activeActivityPlans = await db.query.activityPlans.findMany({
            where: and(eq(activityPlans.userId, userId), eq(activityPlans.status, 'active'))
        });

        const finished: FinishedPlan[] = [];

        for (const activityPlan of activeActivityPlans) {
            const planId = activityPlan.localRefId;
            if (!planId) continue;

            let isFinished = false;

            if (activityPlan.activityType === 'MURAJA') {
                const mPlan = await db.query.weeklyMurajaPlans.findFirst({ where: eq(weeklyMurajaPlans.id, planId) });
                const latestLog = await db.query.dailyMurajaLogs.findFirst({
                    where: eq(dailyMurajaLogs.planId, planId),
                    orderBy: [desc(dailyMurajaLogs.date)]
                });
                isFinished = checkMurajaCompletion(mPlan, latestLog);
            } else if (activityPlan.activityType === 'HIFZ') {
                const hPlan = await db.query.hifzPlans.findFirst({ where: eq(hifzPlans.id, planId) });
                const latestLog = await db.query.hifzLogs.findFirst({
                    where: and(eq(hifzLogs.userId, userId), eq(hifzLogs.hifzPlanId, planId)),
                    orderBy: [desc(hifzLogs.date)]
                });
                isFinished = checkHifzCompletion(hPlan, latestLog);
            }

            if (isFinished) {
                const achievement = await db.query.planAchievements.findFirst({
                    where: and(
                        eq(planAchievements.userId, userId),
                        eq(planAchievements.planType, activityPlan.activityType),
                        eq(planAchievements.localRefId, planId),
                        eq(planAchievements.achievementType, 'COMPLETED')
                    )
                });

                if (!achievement) {
                    finished.push({
                        id: activityPlan.id,
                        activityType: activityPlan.activityType as 'HIFZ' | 'MURAJA',
                        localRefId: planId,
                        title: activityPlan.title || undefined
                    });
                }
            }
        }

        return finished;
    },

 
    async markAchievementSeen(userId: string, planType: 'HIFZ' | 'MURAJA', localRefId: number) {
        const db = getStateDb()
        await db.insert(planAchievements).values({
            userId,
            planType,
            localRefId,
            achievementType: 'COMPLETED'
        }).onConflictDoNothing();
    }
};
