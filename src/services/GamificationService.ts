import { SQLiteDatabase } from "expo-sqlite";

export type BadgeType = "MUTQEEN" | "STREAK_7" | "STREAK_30" | "FIRST_JUZ" | "MYSTERY_REWARD";

export const GamificationService = {
  async awardXP(db: SQLiteDatabase, userId: string, amount: number) {
    await db.runAsync(
      `
      UPDATE user_stats
      SET total_xp = total_xp + ?,
          level = (total_xp + ?) / 1000 -- Simple level logic: 1000 XP per level
      WHERE user_id = ?
      `,
      [amount, amount, userId]
    );
  },

  async awardBadge(db: SQLiteDatabase, userId: string, type: BadgeType, metadata?: any) {
    const badgeId = `${userId}_${type}_${Date.now()}`;
    await db.runAsync(
      `
      INSERT INTO user_badges (badge_id, user_id, badge_type, metadata)
      VALUES (?, ?, ?, ?)
      `,
      [badgeId, userId, type, metadata ? JSON.stringify(metadata) : null]
    );
    return badgeId;
  },

  async processSessionCompletion(
    db: SQLiteDatabase,
    userId: string,
    qualityScore: number,
    streak: number
  ) {
    let xpAwarded = 10; // Base completion XP
    const rewards: string[] = [];

    // Quality Bonus
    if (qualityScore === 5) {
      xpAwarded += 20; // Mutqeen Bonus
      rewards.push("MUTQEEN_BONUS");
      
      // Check for Mutqeen Badge (e.g., if this is the 10th perfect session)
      // For now, just award XP
    }

    // Streak Bonus
    const streakBonus = Math.min(50, streak * 5);
    xpAwarded += streakBonus;

    await this.awardXP(db, userId, xpAwarded);

    // Mystery Reward Logic (Variable Reward)
    // 10% chance if quality is high
    if (qualityScore >= 4 && Math.random() < 0.1) {
      await this.awardBadge(db, userId, "MYSTERY_REWARD");
      rewards.push("MYSTERY_REWARD");
    }

    return { xpAwarded, rewards };
  }
};
