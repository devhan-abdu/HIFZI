
import { db } from "@/src/lib/db/local-client";
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
    async markAchievementSeen(userId: string, planType: 'HIFZ' | 'MURAJA', localRefId: number) {
        await db.insert(planAchievements).values({
            userId,
            planType,
            localRefId,
            achievementType: 'COMPLETED'
        }).onConflictDoNothing();
    }
};
