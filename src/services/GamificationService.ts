import { db as drizzleDb } from "@/src/lib/db/local-client";
import { userStats, userBadges } from "@/src/features/user/database/userSchema";
import { eq, sql } from "drizzle-orm";

export type BadgeType = "MUTQEEN" | "STREAK_7" | "STREAK_30" | "FIRST_JUZ" | "MYSTERY_REWARD";

export const GamificationService = {
  async awardXP(db: any, userId: string, amount: number) {
    const tx = db || drizzleDb;
    await tx.update(userStats)
      .set({
        totalXp: sql`${userStats.totalXp} + ${amount}`,
        level: sql`(${userStats.totalXp} + ${amount}) / 1000`
      })
      .where(eq(userStats.userId, userId));
  },

  async awardBadge(db: any, userId: string, type: BadgeType, metadata?: any) {
    const tx = db || drizzleDb;
    const badgeId = `${userId}_${type}_${Date.now()}`;
    await tx.insert(userBadges).values({
      badgeId,
      userId,
      badgeType: type,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    return badgeId;
  },

  async processSessionCompletion(
    db: any,
    userId: string,
    qualityScore: number,
    streak: number
  ) {
    const tx = db || drizzleDb;
    let xpAwarded = 10;
    const rewards: string[] = [];

    if (qualityScore === 5) {
      xpAwarded += 20; 
      rewards.push("MUTQEEN_BONUS");
      
     
    }

    const streakBonus = Math.min(50, streak * 5);
    xpAwarded += streakBonus;

    await this.awardXP(tx, userId, xpAwarded);

 
    if (qualityScore >= 4 && Math.random() < 0.1) {
      await this.awardBadge(tx, userId, "MYSTERY_REWARD");
      rewards.push("MYSTERY_REWARD");
    }

    return { xpAwarded, rewards };
  }
};
