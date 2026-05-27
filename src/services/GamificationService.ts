import { db as drizzleDb } from "@/src/lib/db/local-client";
import { userStats, userBadges } from "@/src/features/user/database/userSchema";
import { eq, sql, and } from "drizzle-orm";
import { notificationRepository } from "../features/notifications/services/notificationRepository";
import { differenceInDays } from "date-fns";
import { BADGE_DICTIONARY } from "../features/gamification/constants";
import { hifzPlans, hifzLogs } from "@/src/features/hifz/database/hifzSchema";
import { weeklyMurajaPlans, dailyMurajaLogs } from "@/src/features/muraja/database/murajaSchema";

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
        eventKey: `levelup_${newLevel}`
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
    
    // Check if the badge is already awarded
    let isAlreadyAwarded = false;
    
    if (type.startsWith("STREAK")) {
      // 7-day cooldown on the exact same streak badge type to prevent duplicate triggers
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const recentStreakBadge = await tx.query.userBadges.findFirst({
        where: and(
          eq(userBadges.userId, userId),
          eq(userBadges.badgeType, type),
          sql`${userBadges.achievedAt} >= ${oneWeekAgo}`
        )
      });
      isAlreadyAwarded = !!recentStreakBadge;
    } else if (metadata?.planId && metadata?.planType) {
      // Plan-specific progress badges: check if already awarded for this specific planId
      const allBadges = await tx.query.userBadges.findMany({
        where: and(eq(userBadges.userId, userId), eq(userBadges.badgeType, type))
      });
      isAlreadyAwarded = allBadges.some((b: any) => {
        try {
          const meta = JSON.parse(b.metadata ?? "{}");
          return meta.planId === metadata.planId && meta.planType === metadata.planType;
        } catch {
          return false;
        }
      });
    } else {
      // Global badges: check globally
      const existing = await tx.query.userBadges.findFirst({
        where: and(eq(userBadges.userId, userId), eq(userBadges.badgeType, type))
      });
      isAlreadyAwarded = !!existing;
    }

    if (isAlreadyAwarded) return null;

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
        eventKey: `badge_${type}_${metadata?.planId ?? 'global'}`
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
  },

  async checkPlanProgressBadges(db: any, userId: string, planType: 'hifz' | 'muraja', planId: number) {
    const tx = db || drizzleDb;
    try {
      let percentage = 0;

      if (planType === 'hifz') {
        const plan = await tx.query.hifzPlans.findFirst({
          where: eq(hifzPlans.id, planId)
        });
        if (plan) {
          const totalPages = plan.totalPages || 1;
          const logs = await tx.select().from(hifzLogs).where(eq(hifzLogs.hifzPlanId, planId));
          const completedPages = logs.reduce((sum: number, log: any) => {
            if (log.status === "completed" || log.status === "partial") {
              return sum + (log.actualPagesCompleted || 0);
            }
            return sum;
          }, 0);
          percentage = completedPages / totalPages;
        }
      } else if (planType === 'muraja') {
        const plan = await tx.query.weeklyMurajaPlans.findFirst({
          where: eq(weeklyMurajaPlans.id, planId)
        });
        if (plan) {
          const startPage = plan.startPage || 1;
          const endPage = plan.endPage || 604;
          const totalPages = Math.max(1, endPage - startPage + 1);
          const murajaLastPage = plan.murajaLastPage || 0;
          const completedPages = Math.max(0, murajaLastPage - startPage + 1);
          percentage = completedPages / totalPages;
        }
      }

      console.log(`Checking plan progress badges for ${planType} plan ${planId}: percentage = ${percentage * 100}%`);

      const awarded: any[] = [];

      const planMeta = { planId, planType };

      if (percentage >= 0.01) {
        const badge = await this.awardBadge(tx, userId, "SPARK", planMeta, { silent: true });
        if (badge) awarded.push(badge);
      }
      if (percentage >= 0.25) {
        const badge = await this.awardBadge(tx, userId, "QUARTER_FINISHER", planMeta, { silent: true });
        if (badge) awarded.push(badge);
      }
      if (percentage >= 0.50) {
        const badge = await this.awardBadge(tx, userId, "HALF_FINISHER", planMeta, { silent: true });
        if (badge) awarded.push(badge);
      }
      if (percentage >= 1.00) {
        const badge = await this.awardBadge(tx, userId, "PLAN_COMPLETE", planMeta, { silent: true });
        if (badge) awarded.push(badge);
      }

      return awarded;
    } catch (err) {
      console.error("Failed to check plan progress badges:", err);
      return [];
    }
  }
};
