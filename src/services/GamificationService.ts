import { db as drizzleDb } from "@/src/lib/db/local-client";
import { userStats, userBadges } from "@/src/features/user/database/userSchema";
import { eq, sql, and } from "drizzle-orm";
import { notificationRepository } from "../features/notifications/services/notificationRepository";
import { differenceInDays } from "date-fns";
import { BADGE_DICTIONARY } from "../features/gamification/constants";

export type BadgeType = 
  | "STREAK_3" | "STREAK_7" | "STREAK_30" 
  | "MUTQEEN_5" 
  | "QUARTER_FINISHER" | "HALF_FINISHER" | "PLAN_COMPLETE"
  | "MYSTERY_REWARD" | "ELITE_PATH" | "RECOVERY_SHIELD" | "SPARK";

export const GamificationService = {
  async awardXP(db: any, userId: string, amount: number, options?: { silent?: boolean }) {
    const tx = db || drizzleDb;
    
    const stats = await tx.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    if (!stats) return { leveledUp: false, newLevel: 0 };

    const oldLevel = stats.level;
    const newXp = stats.totalXp + amount;
    const newLevel = Math.floor(newXp / 1000);

    await tx.update(userStats)
      .set({
        totalXp: newXp,
        level: newLevel,
      })
      .where(eq(userStats.userId, userId));

    if (newLevel > oldLevel && !options?.silent) {
      await notificationRepository.createNotification(userId, {
        type: 'milestone',
        title: 'Level Up!',
        message: `Mubarak! You've reached Level ${newLevel}! Keep up the great work.`,
        eventKey: `levelup_${newLevel}_${Date.now()}`
      });
    }

    return { 
      leveledUp: newLevel > oldLevel, 
      newLevel,
      xpAwarded: amount
    };
  },

  async awardBadge(db: any, userId: string, type: BadgeType, metadata?: any, options?: { silent?: boolean }) {
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

    // Create a persistent notification for the badge
    const badgeDef = BADGE_DICTIONARY[type];
    const badgeName = badgeDef ? badgeDef.title : type.replace(/_/g, ' ');

    if (!options?.silent) {
      await notificationRepository.createNotification(userId, {
        type: 'milestone',
        title: 'New Badge Earned!',
        message: `Mubarak! You've earned the ${badgeName} badge.`,
        eventKey: `badge_${type}_${Date.now()}`
      });
    }

    return { badgeId, badgeType: type, badgeName };
  },

  async processSessionCompletion(
    db: any,
    userId: string,
    qualityScore: number,
    streak: number
  ) {
    const tx = db || drizzleDb;
    
    // Base XP is 10. Quality multiplier: score 1 = 1x, score 5 = 1.5x
    const qualityMultiplier = 1 + ((qualityScore - 1) * 0.125); // 1 = 1x, 3 = 1.25x, 5 = 1.5x
    let xpAwarded = Math.round(10 * qualityMultiplier); 
    const rewards: string[] = [];

    const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
    let newConsecutivePerfects = stats?.consecutivePerfects || 0;

    const awardedBadges: any[] = [];
    
    // Comeback Badge Logic
    if (stats?.lastActivityDate) {
      const daysInactive = differenceInDays(new Date(), new Date(stats.lastActivityDate));
      if (daysInactive >= 3) {
        const badge = await this.awardBadge(tx, userId, "RECOVERY_SHIELD", undefined, { silent: true });
        if (badge) awardedBadges.push(badge);
        rewards.push("BADGE_RECOVERY_SHIELD");
      }
    }

    if (qualityScore === 5) {
      xpAwarded += 15; // Bonus for perfect quality
      newConsecutivePerfects += 1;
      if (newConsecutivePerfects === 5) {
        const badge = await this.awardBadge(tx, userId, "MUTQEEN_5", undefined, { silent: true });
        if (badge) awardedBadges.push(badge);
        rewards.push("BADGE_MUTQEEN_5");
      }
    } else {
      newConsecutivePerfects = 0;
    }

    await tx.update(userStats)
      .set({ 
        consecutivePerfects: newConsecutivePerfects,
        lastActivityDate: new Date().toISOString() 
      })
      .where(eq(userStats.userId, userId));

    const streakBadges = ["STREAK_3", "STREAK_7", "STREAK_30"] as const;
    const streakThresholds = [3, 7, 30];
    
    for (let i = 0; i < streakThresholds.length; i++) {
      if (streak === streakThresholds[i]) {
        const badge = await this.awardBadge(tx, userId, streakBadges[i], undefined, { silent: true });
        if (badge) awardedBadges.push(badge);
      }
    }

    const streakBonus = Math.min(50, streak * 5); 
    xpAwarded += streakBonus;

    const levelResult = await this.awardXP(tx, userId, xpAwarded, { silent: true });

    return { 
      xpAwarded, 
      rewards, 
      isPerfect: qualityScore === 5,
      levelUp: levelResult.leveledUp ? levelResult.newLevel : null,
      badges: awardedBadges 
    };
  }
};
