import { SQLiteDatabase } from "expo-sqlite";

export type PerformanceLevel = "GREEN" | "YELLOW" | "RED";

export type WeeklyPerformanceReport = {
  completionRate: number;
  averageQuality: number;
  consistencyScore: number;
  level: PerformanceLevel;
  recommendation: string;
};

export const AdaptiveEngineService = {
  async evaluateWeeklyPerformance(
    db: SQLiteDatabase,
    userId: string,
    weekStartDate: string
  ): Promise<WeeklyPerformanceReport> {
    // 1. Fetch Muraja logs for the week
    const murajaLogs = await db.getAllAsync<{ status: string; quality_score: number | null }>(
      `SELECT status, quality_score FROM daily_muraja_logs WHERE date >= ?`,
      [weekStartDate]
    );

    // 2. Fetch Hifz logs for the week
    const hifzLogs = await db.getAllAsync<{ status: string; quality_score: number | null }>(
      `SELECT status, quality_score FROM hifz_logs_local WHERE user_id = ? AND date >= ?`,
      [userId, weekStartDate]
    );

    const allLogs = [...murajaLogs, ...hifzLogs];
    if (allLogs.length === 0) {
      return {
        completionRate: 0,
        averageQuality: 0,
        consistencyScore: 0,
        level: "YELLOW",
        recommendation: "Not enough data for this week. Keep going!",
      };
    }

    const completed = allLogs.filter((l) => l.status === "completed").length;
    const completionRate = (completed / allLogs.length) * 100;

    const qualityScores = allLogs
      .map((l) => l.quality_score)
      .filter((q): q is number => q !== null && q !== undefined);
    
    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
      : 0;

    let level: PerformanceLevel = "YELLOW";
    let recommendation = "";

    if (completionRate >= 85 && averageQuality >= 4) {
      level = "GREEN";
      recommendation = "Excellent work! You're ready to increase your workload by 10%. Keep the Itqan high!";
    } else if (completionRate < 60 || (averageQuality < 3 && averageQuality > 0)) {
      level = "RED";
      recommendation = "Recovery Week Activated. We've paused new Hifz to help you solidify your current pages. Focus on quality over quantity.";
    } else {
      level = "YELLOW";
      recommendation = "Steady progress. Maintain your current pace and focus on consistent daily recitation.";
    }

    return {
      completionRate,
      averageQuality,
      consistencyScore: completionRate, // Simplified
      level,
      recommendation,
    };
  },

  async applyRecommendation(db: SQLiteDatabase, userId: string, level: PerformanceLevel) {
    if (level === "RED") {
      // Pause active Hifz plans
      await db.runAsync(
        "UPDATE hifz_plans_local SET status = 'paused' WHERE user_id = ? AND status = 'active'",
        [userId]
      );
    } else if (level === "GREEN") {
      // Logic to increase pages_per_day could go here
      // For now, we'll just log it or provide the UI option
    }
  }
};
