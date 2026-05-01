import { db as drizzleDb } from "@/src/lib/db/local-client";
import { userStats, userBadges } from "@/src/features/user/database/userSchema";
import { eq, sql, and } from "drizzle-orm";

export type BadgeType = 
  | "STREAK_3" | "STREAK_7" | "STREAK_30" 
  | "MUTQEEN_5" 
  | "QUARTER_FINISHER" | "HALF_FINISHER" | "PLAN_COMPLETE"
  | "MYSTERY_REWARD" | "ELITE_PATH" | "RECOVERY_SHIELD" | "SPARK";

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
    const existing = await tx.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeType, type))
    });
    if (existing && !type.startsWith("STREAK")) return null; 

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
    let xpAwarded = 20;
    const rewards: string[] = [];

    const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
    let newConsecutivePerfects = stats?.consecutivePerfects || 0;

    if (qualityScore === 5) {
      xpAwarded += 30; // Quality Bonus
      newConsecutivePerfects += 1;
      if (newConsecutivePerfects === 5) {
        await this.awardBadge(tx, userId, "MUTQEEN_5");
        rewards.push("BADGE_MUTQEEN_5");
      }
    } else {
      newConsecutivePerfects = 0;
    }

    await tx.update(userStats)
      .set({ consecutivePerfects: newConsecutivePerfects })
      .where(eq(userStats.userId, userId));

    if (streak === 3) await this.awardBadge(tx, userId, "STREAK_3");
    if (streak === 7) await this.awardBadge(tx, userId, "STREAK_7");
    if (streak === 30) await this.awardBadge(tx, userId, "STREAK_30");

    const streakBonus = Math.min(100, streak * 10);
    xpAwarded += streakBonus;

    await this.awardXP(tx, userId, xpAwarded);

    return { xpAwarded, rewards, isPerfect: qualityScore === 5 };
  }
};
