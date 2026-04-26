import { db } from "@/src/lib/db/local-client";
import { userStats } from "@/src/features/user/database/userSchema";
import { habitEvents, notifications } from "../database/notificationSchema";
import { notificationRepository } from "./notificationRepository";
import { notificationManager } from "./notificationManager";
import { eq, and, sql } from "drizzle-orm";
import { supabase } from "@/src/lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_RISK_HOUR = 18;

export const notificationService = {

  toDateKey(date = new Date()) {
    return date.toISOString().split('T')[0];
  },

  getYesterdayKey(now = new Date()) {
    return new Date(now.getTime() - DAY_MS).toISOString().split('T')[0];
  },


  async syncWithRemote(userId: string) {
    try {
      const pendingNotifs = await db.query.notifications.findMany({
        where: and(eq(notifications.userId, userId), eq(notifications.syncStatus, 0)),
        limit: 50
      });

      for (const item of pendingNotifs) {
        const { data, error } = await supabase
          .from('notifications')
          .upsert({
            user_id: userId,
            type: item.type,
            title: item.title,
            message: item.message,
            event_key: item.eventKey,
            is_read: item.isRead === 1,
            created_at: item.createdAt,
            local_id: item.id
          }, { onConflict: 'user_id,event_key' })
          .select('id').single();

        if (!error && data) {
          await db.update(notifications)
            .set({ syncStatus: 1, remoteId: String(data.id), updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(notifications.id, item.id));
        }
      }

      const pendingEvents = await db.query.habitEvents.findMany({
        where: and(eq(habitEvents.userId, userId), eq(habitEvents.syncStatus, 0)),
        limit: 50
      });

      for (const item of pendingEvents) {
        const { error } = await supabase
          .from('habit_events')
          .upsert({
            user_id: userId,
            habit_type: item.habitType,
            status: item.status,
            date: item.date,
            xp_gained: item.xpGained,
            local_id: item.id
          }, { onConflict: 'user_id,habit_type,date' });

        if (!error) {
          await db.update(habitEvents)
            .set({ syncStatus: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(habitEvents.id, item.id));
        }
      }
    } catch (e) {
      console.warn("Notification background sync failed:", e);
    }
  },


  async processHabitEvent(payload: {
    userId: string;
    displayName?: string;
    habitType: 'hifz' | 'muraja';
    status: 'completed' | 'partial' | 'missed';
    date: string;
  }) {
    const xpGained = payload.status === 'completed' ? 50 : (payload.status === 'partial' ? 20 : 0);
    const todayKey = this.toDateKey();

    await notificationRepository.upsertHabitEvent(payload.userId, {
      habitType: payload.habitType,
      status: payload.status,
      date: payload.date,
      xpGained
    });

    const allEvents = await notificationRepository.getHabitEvents(payload.userId);
    const streaks = this.calculateStreaks(allEvents.map(e => e.date), todayKey);
    
    const totalXpResult = await db.select({ total: sql<number>`sum(xp_gained)` })
      .from(habitEvents)
      .where(eq(habitEvents.userId, payload.userId));
    
    const totalXp = totalXpResult[0]?.total ?? 0;
    const level = Math.floor(totalXp / 100);
    const xpToNextLevel = (level + 1) * 100 - totalXp;

    await db.insert(userStats)
      .values({
        userId: payload.userId,
        totalXp,
        level,
        [payload.habitType === 'hifz' ? 'hifzCurrentStreak' : 'murajaCurrentStreak']: streaks.current,
        globalLongestStreak: streaks.longest,
        lastActivityDate: payload.date,
        lastNotifiedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          totalXp,
          level,
          [payload.habitType === 'hifz' ? 'hifzCurrentStreak' : 'murajaCurrentStreak']: streaks.current,
          globalLongestStreak: streaks.longest,
          lastActivityDate: payload.date,
          lastNotifiedAt: new Date().toISOString(),
        }
      });

    if (xpGained > 0) {
      await this.triggerXPReward(payload.userId, payload.habitType, payload.status, payload.date, xpGained, xpToNextLevel);
    }

    if (streaks.current > 0 && streaks.current % 5 === 0) {
      await this.triggerStreakMilestone(payload.userId, payload.displayName ?? "Hafiz", streaks.current);
    }

    await this.refreshSchedules(payload.userId);
    void this.syncWithRemote(payload.userId);
  },

  async triggerXPReward(userId: string, habitType: string, status: string, date: string, gained: number, remaining: number) {
    const eventKey = `xp:${habitType}:${status}:${date}:${gained}`;
    const result = await notificationRepository.createNotification(userId, {
      type: 'xp',
      title: "XP Earned",
      message: `✨ Great job! You earned ${gained} XP. Only ${remaining} XP to level up!`,
      eventKey
    });

    if (result) {
      await notificationManager.sendLocal({ 
        title: result.title, 
        body: result.body,
        data: { type: 'xp', eventKey }
      });
    }
  },

  async triggerStreakMilestone(userId: string, name: string, streak: number) {
    const eventKey = `milestone:${streak}:${this.toDateKey()}`;
    const result = await notificationRepository.createNotification(userId, {
      type: 'milestone',
      title: "Streak Milestone",
      message: `🔥 ${name}! You're on a ${streak}-day streak! Keep going!`,
      eventKey
    });

    if (result) {
      await notificationManager.sendLocal({ 
        title: result.title, 
        body: result.body,
        data: { type: 'milestone', eventKey }
      });
    }
  },

  async refreshSchedules(userId: string) {
    const now = new Date();
    const todayKey = this.toDateKey(now);
    
    const expired = await notificationRepository.getExpiredSchedules(userId, todayKey);
    for (const row of expired) {
      if (row.notificationIdentifier) await notificationManager.cancel(row.notificationIdentifier);
      await notificationRepository.deleteScheduledNotification(userId, row.eventKey);
    }

    for (const habit of ['hifz', 'muraja'] as const) {
      await this.scheduleRiskWarning(userId, habit, now);
    }
  },

  async scheduleRiskWarning(userId: string, habit: 'hifz' | 'muraja', now: Date) {
    const todayKey = this.toDateKey(now);
    const eventKey = `risk:${habit}:${todayKey}`;
    const scheduleKey = `schedule:risk:${habit}:${todayKey}`;

    const allEvents = await notificationRepository.getHabitEvents(userId);
    const hasToday = allEvents.some(e => e.habitType === habit && e.date === todayKey && e.status !== 'missed');
    
    if (hasToday) {
      const existing = await notificationRepository.getScheduledNotification(userId, scheduleKey);
      if (existing?.notificationIdentifier) await notificationManager.cancel(existing.notificationIdentifier);
      await notificationRepository.deleteScheduledNotification(userId, scheduleKey);
      return;
    }

    const yesterdayKey = this.getYesterdayKey(now);
    const hasYesterday = allEvents.some(e => e.habitType === habit && e.date === yesterdayKey && e.status !== 'missed');
    
    if (!hasYesterday) return;

    const triggerDate = new Date(now);
    triggerDate.setHours(STREAK_RISK_HOUR, 0, 0, 0);

    if (now.getTime() < triggerDate.getTime()) {
      const existing = await notificationRepository.getScheduledNotification(userId, scheduleKey);
      if (!existing) {
        const identifier = await notificationManager.schedule({
          title: "Streak Risk",
          body: `⚠️ Your ${habit} streak is in danger! Complete it before midnight!`,
          data: { type: 'warning', habit, eventKey },
          trigger: triggerDate
        });
        
        if (identifier) {
          await notificationRepository.upsertScheduledNotification(userId, {
            kind: 'streak_risk',
            habitType: habit,
            eventKey: scheduleKey,
            scheduledFor: triggerDate.toISOString(),
            notificationIdentifier: identifier
          });
        }
      }
    }
  },

  calculateStreaks(dates: string[], todayKey: string) {
    const uniqueSorted = Array.from(new Set(dates)).sort();
    const set = new Set(uniqueSorted);
    
    let current = 0;
    let cursor = new Date(todayKey);
    while (set.has(this.toDateKey(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    let longest = 0;
    let running = 0;
    let prev: Date | null = null;
    
    for (const d of uniqueSorted) {
      const curr = new Date(d);
      if (!prev) {
        running = 1;
      } else {
        const diff = Math.round((curr.getTime() - prev.getTime()) / DAY_MS);
        running = (diff === 1) ? running + 1 : 1;
      }
      longest = Math.max(longest, running);
      prev = curr;
    }
    
    return { current, longest };
  }
};
