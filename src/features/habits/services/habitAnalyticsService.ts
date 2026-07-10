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
        if (eventType.includes("_COMPLETED") && !meta.isReinforcement) {
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
    const { goalPages, plannedDays } = await this.calculateDailyGoalAndDays(userId);

    const userStat = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });
    const currentStreak = userStat?.murajaCurrentStreak ?? 0;
    const longestStreak = userStat?.globalLongestStreak ?? 0;

    const analytics = this.calculateAnalytics(finalizedList, rangeEntries, currentStreak, longestStreak);

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

    // Fetch plannedDays so rest days don't break the streak
    const { plannedDays } = await this.calculateDailyGoalAndDays(userId);

    const currentStreak = this.computeCurrentStreak(dates, plannedDays);
    const longestStreak = this.computeLongestStreak(dates, plannedDays);

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
    const { goalPages } = await this.calculateDailyGoalAndDays(userId);
    return goalPages;
  },

  async calculateDailyGoalAndDays(userId: string): Promise<{ goalPages: number; plannedDays: number[] }> {
    try {
      const { weeklyMurajaPlans, hifzPlans } = await import("@/src/lib/db/schema");

      const murajaPlan = await db.select({
        goal: weeklyMurajaPlans.plannedPagesPerDay,
        selectedDays: weeklyMurajaPlans.selectedDays,
      })
        .from(weeklyMurajaPlans)
        .where(and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.isActive, true)))
        .limit(1);
      const murajaGoal = murajaPlan[0]?.goal || 0;
      const murajaDays: number[] = murajaPlan[0]?.selectedDays
        ? JSON.parse(murajaPlan[0].selectedDays as string)
        : [];

      const hifzPlan = await db.select({
        goal: hifzPlans.pagesPerDay,
        selectedDays: hifzPlans.selectedDays,
      })
        .from(hifzPlans)
        .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')))
        .limit(1);
      const hifzGoal = hifzPlan[0]?.goal || 0;
      const hifzDays: number[] = hifzPlan[0]?.selectedDays
        ? JSON.parse(hifzPlan[0].selectedDays as string)
        : [];

      // Union of all planned days (0=Mon … 6=Sun)
      const plannedDays = Array.from(new Set([...murajaDays, ...hifzDays]));

      return { goalPages: Math.round(murajaGoal + hifzGoal), plannedDays };
    } catch (e) {
      console.warn("Failed to calculate daily goal", e);
      return { goalPages: 0, plannedDays: [] };
    }
  },

  calculateAnalytics(allEntries: any[], rangeEntries: any[], currentStreak: number, longestStreak: number) {
    const completedRange = rangeEntries.filter(e => e.eventType.includes("_COMPLETED"));
    const missedRange = rangeEntries.filter(e => e.eventType === "TASK_MISSED");
    
    // Global stats derived from ALL historical logs
    const totalMinutes = allEntries.reduce((acc, e) => acc + (e.minutesSpent || 0), 0);
    const totalPages = allEntries.reduce((acc, e) => acc + (e.unitsCompleted || 0), 0);

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

  computeCurrentStreak(dates: string[], plannedDays: number[] = []) {
    if (dates.length === 0) return 0;

    const set = new Set(dates);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Start from today if logged, else yesterday if logged, else no streak
    let cursorStr = set.has(today) ? today : (set.has(yesterday) ? yesterday : null);
    if (!cursorStr) return 0;

    let streak = 0;
    // Use UTC date to avoid timezone offset shifts when using toISOString
    let cursor = new Date(`${cursorStr}T00:00:00Z`);

    while (true) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (set.has(dateStr)) {
        streak++;
      } else {
        // If this day was a planned day that was missed → break streak
        // (plannedDays uses Mon=0 … Sun=6 convention)
        const dayOfWeek = (cursor.getDay() + 6) % 7;
        const isPlanned = plannedDays.length === 0 || plannedDays.includes(dayOfWeek);
        if (isPlanned) break; // missed a required day — streak over
        // Otherwise it's a rest day — skip and keep counting
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      // Safety: don't walk more than 2 years back
      if (streak > 730) break;
    }
    return streak;
  },

  computeLongestStreak(dates: string[], plannedDays: number[] = []) {
    if (dates.length === 0) return 0;

    let longest = 0, current = 0;
    let prev: Date | null = null;

    for (const d of dates) {
      // Use UTC date to avoid timezone shift
      const date = new Date(`${d}T00:00:00Z`);
      if (!prev) {
        current = 1;
      } else {
        const diffDays = Math.round((date.getTime() - prev.getTime()) / 86400000);
        if (diffDays === 1) {
          current += 1;
        } else if (diffDays > 1) {
          // Check if any of the skipped days were planned — if all were rest days, streak continues
          let brokeStreak = false;
          for (let i = 1; i < diffDays; i++) {
            const skipped = new Date(prev.getTime() + i * 86400000);
            const dayOfWeek = (skipped.getDay() + 6) % 7;
            const isPlanned = plannedDays.length === 0 || plannedDays.includes(dayOfWeek);
            if (isPlanned) { brokeStreak = true; break; }
          }
          current = brokeStreak ? 1 : current + 1;
        }
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
