import { db } from "@/src/lib/db/local-client";
import { activityLogs, adaptiveGuidanceCache } from "../database/habitSchema";
import { userStats } from "../../user/database/userSchema";
import { eq, and, sql, desc, lte, asc } from "drizzle-orm";
import { ActivityType, ActivityEventType, HabitProgressSnapshot, HabitHistoryEntry, HabitLogMetadata } from "./habitTypes";

export const habitAnalyticsService = {
  

  async getProgressSnapshot(userId: string, startDate: string, endDate: string): Promise<HabitProgressSnapshot> {
    const logs = await db.query.activityLogs.findMany({
      where: and(eq(activityLogs.userId, userId), lte(activityLogs.date, endDate)),
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

    for (const log of logs) {
      const meta = this.safeParseMetadata(log.metadata);
      const eventType = meta.eventType || this.defaultEventType(log.activityType as ActivityType);
      const sourceDate = meta.sourceDate || log.date;
      const sourceKey = meta.sourceKey || `${log.activityType}:${log.planId ?? "na"}:${sourceDate}`;
      
      finalBySource.set(sourceKey, { ...log, eventType, sourceDate });

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

    const finalizedEntries = Array.from(finalBySource.values()).filter(
      (e) => e.sourceDate >= startDate && e.sourceDate <= endDate
    );

    const heatmap = this.calculateHeatmap(finalizedEntries);
    const analytics = this.calculateAnalytics(finalizedEntries, startDate, endDate, userId);

    return {
      userHistory: this.calculateUserHistory(finalizedEntries),
      weekHistory: [],
      historyEntries: historyEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      heatmap,
      reflections: reflections.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
      analytics: await analytics,
      progressByType,
      activityHash: this.computeActivityHash(finalizedEntries),
      lastActivityAt: finalizedEntries[finalizedEntries.length - 1]?.updatedAt || null,
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

  async calculateAnalytics(entries: any[], start: string, end: string, userId: string) {
    const completed = entries.filter(e => e.eventType.includes("_COMPLETED"));
    const missed = entries.filter(e => e.eventType === "TASK_MISSED");
    const totalMinutes = entries.reduce((acc, e) => acc + (e.minutesSpent || 0), 0);
    const totalPages = entries.reduce((acc, e) => acc + (e.unitsCompleted || 0), 0);

    const stats = await db.query.userStats.findFirst({ where: eq(userStats.userId, userId) });

    return {
      completionRate: Math.round((completed.length / Math.max(1, completed.length + missed.length)) * 100),
      currentStreak: stats?.murajaCurrentStreak || 0,
      longestStreak: stats?.globalLongestStreak || 0,
      totalMinutes,
      totalPages,
      completedCount: completed.length,
      missedCount: missed.length,
      revisionFrequency: 0, // Placeholder
    };
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
    const set = new Set(dates);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let cursor = set.has(today) ? today : (set.has(yesterday) ? yesterday : null);
    if (!cursor) return 0;

    let streak = 0;
    let current = new Date(cursor);
    while (set.has(current.toISOString().split('T')[0])) {
      streak++;
      current.setDate(current.getDate() - 1);
    }
    return streak;
  },

  computeLongestStreak(dates: string[]) {
    let longest = 0, current = 0, prev = null;
    for (const d of dates) {
      const date = new Date(d);
      if (!prev) current = 1;
      else {
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
