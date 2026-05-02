import { db } from "@/src/lib/db/local-client";
import { activityLogs } from "../database/habitSchema";
import { userStats } from "../../user/database/userSchema";
import { eq, and, sql, desc, lte, asc } from "drizzle-orm";
import { ActivityType, ActivityEventType, HabitProgressSnapshot, HabitHistoryEntry, HabitLogMetadata } from "./habitTypes";

export const habitAnalyticsService = {
  

  async getProgressSnapshot(userId: string, startDate: string, endDate: string): Promise<HabitProgressSnapshot> {
    const today = new Date().toISOString().split('T')[0];
    
    const allLogs = await db.query.activityLogs.findMany({
      where: eq(activityLogs.userId, userId),
      orderBy: [asc(activityLogs.date), asc(activityLogs.id)],
    });

    const progressByType: Record<ActivityType, { minutes: number; units: number; sessions: number }> = {
      HIFZ: { minutes: 0, units: 0, sessions: 0 },
      MURAJA: { minutes: 0, units: 0, sessions: 0 },
      NORMAL_READING: { minutes: 0, units: 0, sessions: 0 },
    };

    const finalBySource = new Map<string, any>();
    const historyEntries: HabitHistoryEntry[] = [];
    const reflections: HabitProgressSnapshot["reflections"] = [];

    let completedPagesToday = 0;

    for (const log of allLogs) {
      const meta = this.safeParseMetadata(log.metadata);
      const eventType = meta.eventType || this.defaultEventType(log.activityType as ActivityType);
      const sourceDate = meta.sourceDate || log.date;
      const sourceKey = meta.sourceKey || `${log.activityType}:${log.planId ?? "na"}:${sourceDate}`;
      
      finalBySource.set(sourceKey, { ...log, eventType, sourceDate });

      if (sourceDate === today) {
        if (eventType.includes("_COMPLETED")) {
          completedPagesToday += log.unitsCompleted || 0;
        }
      }

      if (sourceDate >= startDate && sourceDate <= endDate) {
        historyEntries.push({
          id: log.id,
          type: eventType,
          timestamp: meta.recordedAt || log.updatedAt || log.date,
          activityType: log.activityType as ActivityType,
          date: sourceDate,
          reference: meta.reference ?? null,
          minutes: log.minutesSpent,
          units: log.unitsCompleted,
        });

        if (log.note?.trim()) {
          reflections.push({
            id: log.id,
            date: sourceDate,
            reflection_text: log.note,
            activity_type: log.activityType,
            verses_read: log.unitsCompleted,
          });
        }
      }
    }

    const finalizedList = Array.from(finalBySource.values());
    const rangeEntries = finalizedList.filter(e => e.sourceDate >= startDate && e.sourceDate <= endDate);

    const heatmap = this.calculateHeatmap(rangeEntries);
    const analytics = this.calculateAnalytics(finalizedList, rangeEntries, userId);

    const goalPages = await this.calculateDailyGoal(userId);

    return {
      userHistory: this.calculateUserHistory(rangeEntries),
      weekHistory: [],
      historyEntries: historyEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      heatmap,
      reflections: reflections.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
      analytics,
      progressByType,
      todayStats: {
        completedPages: completedPagesToday,
        goalPages,
        percent: goalPages > 0 ? Math.round((completedPagesToday / goalPages) * 100) : 0
      },
      activityHash: this.computeActivityHash(rangeEntries),
      lastActivityAt: finalizedList[finalizedList.length - 1]?.updatedAt || null,
    };
  },

  async recalculateStreaks(userId: string) {
    const logs = await db.select({ date: activityLogs.date })
      .from(activityLogs)
      .where(and(eq(activityLogs.userId, userId), sql`${activityLogs.unitsCompleted} > 0`))
      .groupBy(activityLogs.date)
      .orderBy(asc(activityLogs.date));

    const dates = logs.map(l => l.date);
    const currentStreak = this.computeCurrentStreak(dates);
    const longestStreak = this.computeLongestStreak(dates);

    // Update userStats as a cache
    await db.insert(userStats)
      .values({ userId, murajaCurrentStreak: currentStreak, globalLongestStreak: longestStreak })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          murajaCurrentStreak: currentStreak,
          globalLongestStreak: sql`MAX(${userStats.globalLongestStreak}, ${longestStreak})`
        }
      });

    return { currentStreak, longestStreak };
  },

  async calculateDailyGoal(userId: string): Promise<number> {
    try {
      const { weeklyMurajaPlans, hifzPlans } = await import("@/src/lib/db/schema");

      const murajaPlan = await db.select({ goal: weeklyMurajaPlans.plannedPagesPerDay })
        .from(weeklyMurajaPlans)
        .where(and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.isActive, true)))
        .limit(1);
      const murajaGoal = murajaPlan[0]?.goal || 0;

      const hifzPlan = await db.select({ goal: hifzPlans.pagesPerDay })
        .from(hifzPlans)
        .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')))
        .limit(1);
      const hifzGoal = hifzPlan[0]?.goal || 0;

      return Math.round(murajaGoal + hifzGoal);
    } catch (e) {
      console.warn("Failed to calculate daily goal", e);
      return 0;
    }
  },

  calculateAnalytics(allEntries: any[], rangeEntries: any[], userId: string) {
    const completedRange = rangeEntries.filter(e => e.eventType.includes("_COMPLETED"));
    const missedRange = rangeEntries.filter(e => e.eventType === "TASK_MISSED");
    
    // Global stats derived from ALL historical logs
    const totalMinutes = allEntries.reduce((acc, e) => acc + (e.minutesSpent || 0), 0);
    const totalPages = allEntries.reduce((acc, e) => acc + (e.unitsCompleted || 0), 0);

    // Derive streaks from full history
    const completionDates = Array.from(new Set(
      allEntries
        .filter(e => e.eventType.includes("_COMPLETED") && (e.unitsCompleted || 0) > 0)
        .map(e => e.sourceDate)
    )).sort();

    const currentStreak = this.computeCurrentStreak(completionDates);
    const longestStreak = this.computeLongestStreak(completionDates);

    return {
      completionRate: Math.round((completedRange.length / Math.max(1, completedRange.length + missedRange.length)) * 100),
      currentStreak,
      longestStreak,
      totalMinutes,
      totalPages,
      completedCount: completedRange.length,
      missedCount: missedRange.length,
      revisionFrequency: 0,
    };
  },

  calculateUserHistory(entries: any[]) {
    const grouped = new Map<string, any[]>();
    entries.forEach(e => {
      const list = grouped.get(e.sourceDate) || [];
      list.push(e);
      grouped.set(e.sourceDate, list);
    });

    return Array.from(grouped.entries()).map(([date, items]) => {
      const completed = items.some(i => i.eventType.includes("_COMPLETED"));
      const missed = items.some(i => i.eventType === "TASK_MISSED");
      return {
        date,
        status: (completed && missed ? "partial" : completed ? "completed" : missed ? "missed" : "pending") as any
      };
    });
  },

  calculateHeatmap(entries: any[]) {
    const map = new Map<string, { count: number; minutes: number }>();
    entries.forEach(e => {
      const existing = map.get(e.sourceDate) || { count: 0, minutes: 0 };
      if (e.eventType.includes("_COMPLETED")) {
        existing.count += 1;
        existing.minutes += e.minutesSpent || 0;
      }
      map.set(e.sourceDate, existing);
    });
    return Array.from(map.entries()).map(([date, val]) => ({ date, ...val }));
  },

  computeCurrentStreak(dates: string[]) {
    if (dates.length === 0) return 0;
    
    const set = new Set(dates);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let cursorStr = set.has(today) ? today : (set.has(yesterday) ? yesterday : null);
    if (!cursorStr) return 0;

    let streak = 0;
    let cursor = new Date(cursorStr);
    
    while (set.has(cursor.toISOString().split('T')[0])) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  },

  computeLongestStreak(dates: string[]) {
    if (dates.length === 0) return 0;
    
    let longest = 0, current = 0, prev = null;
    for (const d of dates) {
      const date = new Date(d);
      if (!prev) {
        current = 1;
      } else {
        const diff = Math.round((date.getTime() - prev.getTime()) / 86400000);
        current = diff === 1 ? current + 1 : 1;
      }
      longest = Math.max(longest, current);
      prev = date;
    }
    return longest;
  },

  computeActivityHash(entries: any[]) {
    const raw = entries.map(e => `${e.sourceDate}:${e.eventType}`).join("|");
    return `v2-${raw.length.toString(16)}`; 
  },

  safeParseMetadata(metadata: string | null): HabitLogMetadata {
    try { return metadata ? JSON.parse(metadata) : {}; } catch { return {}; }
  },

  defaultEventType(type: ActivityType): ActivityEventType {
    return `${type}_COMPLETED` as ActivityEventType;
  }
};
