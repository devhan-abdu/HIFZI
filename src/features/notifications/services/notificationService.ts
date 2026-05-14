import { getStateDb } from "@/src/lib/db/local-client";
import { userStats } from "@/src/features/user/database/userSchema";
import { habitEvents, notifications } from "../database/notificationSchema";
import { activityPlans } from "@/src/features/habits/database/habitSchema";
import { notificationRepository } from "./notificationRepository";
import { notificationManager } from "./notificationManager";
import { eq, and, sql } from "drizzle-orm";
import { supabase } from "@/src/lib/supabase";
import { COMEBACK_TEMPLATES, STREAK_WARNING_TEMPLATES } from "../../gamification/constants";

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
       const db = getStateDb()
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
    rewards?: any;
  }) {
    const xpGained = payload.status === 'completed' ? 50 : (payload.status === 'partial' ? 20 : 0);
    const todayKey = this.toDateKey();
    const db = getStateDb()

    await notificationRepository.upsertHabitEvent(payload.userId, {
      habitType: payload.habitType,
      status: payload.status,
      date: payload.date,
      xpGained
    });

    const activePlan = await db.query.activityPlans.findFirst({
      where: and(
        eq(activityPlans.userId, payload.userId),
        eq(activityPlans.activityType, payload.habitType.toUpperCase() as any),
        eq(activityPlans.status, 'active')
      )
    });
    
    let selectedDays = [0, 1, 2, 3, 4, 5, 6];
    if (activePlan?.metadata) {
      try {
        const meta = JSON.parse(activePlan.metadata);
        if (meta.selectedDays && Array.isArray(meta.selectedDays)) {
          selectedDays = meta.selectedDays;
        }
      } catch (e) {}
    }

    const allEvents = await notificationRepository.getHabitEvents(payload.userId);
    const streaks = this.calculateStreaks(allEvents.filter(e => e.habitType === payload.habitType).map(e => e.date), todayKey, selectedDays);
    
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

    if (payload.status !== 'missed') {
      await this.sendConsolidatedNotification(payload.userId, {
        displayName: payload.displayName ?? "Hafiz",
        streak: streaks.current,
        levelUp: payload.rewards?.levelUp,
        badges: payload.rewards?.badges,
        habitType: payload.habitType
      });
    }

    await this.refreshSchedules(payload.userId);
    void this.syncWithRemote(payload.userId);
  },

  async removeHabitEvent(userId: string, habitType: 'hifz' | 'muraja', date: string) {
    const db = getStateDb()
    await notificationRepository.deleteHabitEvent(userId, habitType, date);
    
    const todayKey = this.toDateKey();
    
    const activePlan = await db.query.activityPlans.findFirst({
      where: and(
        eq(activityPlans.userId, userId),
        eq(activityPlans.activityType, habitType.toUpperCase() as any),
        eq(activityPlans.status, 'active')
      )
    });
    
    let selectedDays = [0, 1, 2, 3, 4, 5, 6];
    if (activePlan?.metadata) {
      try {
        const meta = JSON.parse(activePlan.metadata);
        if (meta.selectedDays && Array.isArray(meta.selectedDays)) {
          selectedDays = meta.selectedDays;
        }
      } catch (e) {}
    }

    const allEvents = await notificationRepository.getHabitEvents(userId);
    const streaks = this.calculateStreaks(allEvents.filter(e => e.habitType === habitType).map(e => e.date), todayKey, selectedDays);
    
    const totalXpResult = await db.select({ total: sql<number>`sum(xp_gained)` })
      .from(habitEvents)
      .where(eq(habitEvents.userId, userId));
    
    const totalXp = totalXpResult[0]?.total ?? 0;
    const level = Math.floor(totalXp / 100);

    await db.update(userStats)
      .set({
        totalXp,
        level,
        [habitType === 'hifz' ? 'hifzCurrentStreak' : 'murajaCurrentStreak']: streaks.current,
        globalLongestStreak: streaks.longest,
      })
      .where(eq(userStats.userId, userId));

    await this.refreshSchedules(userId);
    void this.syncWithRemote(userId);
  },

  async sendConsolidatedNotification(userId: string, data: {
    displayName: string;
    streak: number;
    levelUp?: number | null;
    badges?: any[];
    habitType: string;
  }) {
    let title = "Great Work!";
    let message = `You've completed your ${data.habitType} session. Keep it up!`;
    let type: 'milestone' | 'warning' | 'xp' = 'milestone';
    let eventKey = `consolidated:${data.habitType}:${this.toDateKey()}`;

    // Priority 1: Badges
    if (data.badges && data.badges.length > 0) {
      const badge = data.badges[0];
      title = "New Badge Earned!";
      message = `Mubarak! You've earned the ${badge.badgeName} badge.`;
      if (data.levelUp) message += ` and reached Level ${data.levelUp}!`;
      else if (data.streak > 0 && data.streak % 5 === 0) message += ` on your ${data.streak}-day streak!`;
      eventKey = `badge:${badge.badgeType}:${this.toDateKey()}`;
    } 
    // Priority 2: Level Up
    else if (data.levelUp) {
      title = "Level Up!";
      const templates = [
        `Mubarak! You've reached Level ${data.levelUp}! Keep ascending.`,
        `Amazing! You are now Level ${data.levelUp}. Your dedication is inspiring.`,
        `Level Up! ${data.levelUp} looks great on you. Keep going!`
      ];
      message = templates[Math.floor(Math.random() * templates.length)];
      if (data.streak > 0 && data.streak % 5 === 0) message += ` 🔥 ${data.streak}-day streak!`;
      eventKey = `levelup:${data.levelUp}:${this.toDateKey()}`;
    }
    // Priority 3: Streak Milestone
    else if (data.streak > 0 && data.streak % 5 === 0) {
      title = "Streak Milestone";
      const templates = [
        `🔥 ${data.displayName}! You're on a ${data.streak}-day streak! Keep going!`,
        `Consistency is key! ${data.streak} days and counting. Mubarak!`,
        `Mashallah! A ${data.streak}-day streak. You're becoming a Muraja master.`
      ];
      message = templates[Math.floor(Math.random() * templates.length)];
      eventKey = `milestone:${data.streak}:${this.toDateKey()}`;
    } else {
      // If none of the above, we don't send a notification (removing the "XP Earned" one)
      return;
    }

    const result = await notificationRepository.createNotification(userId, {
      type,
      title,
      message,
      eventKey
    });

    if (result) {
      await notificationManager.sendLocal({ 
        title: result.title, 
        body: result.body,
        data: { type, eventKey }
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
      await this.scheduleSmartReminders(userId, habit, now);
    }
  },

  async scheduleSmartReminders(userId: string, habit: 'hifz' | 'muraja', now: Date) {
    const todayKey = this.toDateKey(now);
    const scheduleKey = `schedule:risk:${habit}:${todayKey}`;

    const allEvents = await notificationRepository.getHabitEvents(userId);
    const hasToday = allEvents.some(e => e.habitType === habit && e.date === todayKey && e.status !== 'missed');
    
    if (hasToday) {
      const existing = await notificationRepository.getScheduledNotification(userId, scheduleKey);
      if (existing?.notificationIdentifier) await notificationManager.cancel(existing.notificationIdentifier);
      await notificationRepository.deleteScheduledNotification(userId, scheduleKey);
      
      const day3 = new Date(now.getTime() + 3 * DAY_MS);
      day3.setHours(STREAK_RISK_HOUR, 0, 0, 0);
      const comebackKey = `schedule:comeback:${habit}:${this.toDateKey(day3)}`;
      
      const existingComeback = await notificationRepository.getScheduledNotification(userId, comebackKey);
      if (!existingComeback) {
        const body = COMEBACK_TEMPLATES[Math.floor(Math.random() * COMEBACK_TEMPLATES.length)];
        const identifier = await notificationManager.schedule({
          title: "Waiting For You",
          body,
          data: { type: 'comeback', habit, eventKey: comebackKey },
          trigger: day3
        });
        
        if (identifier) {
          await notificationRepository.upsertScheduledNotification(userId, {
            kind: 'streak_risk',
            habitType: habit,
            eventKey: comebackKey,
            scheduledFor: day3.toISOString(),
            notificationIdentifier: identifier
          });
        }
      }
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
        const body = STREAK_WARNING_TEMPLATES[Math.floor(Math.random() * STREAK_WARNING_TEMPLATES.length)];
        const identifier = await notificationManager.schedule({
          title: "Streak Risk",
          body,
          data: { type: 'warning', habit, eventKey: scheduleKey },
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

  calculateStreaks(dates: string[], todayKey: string, selectedDays: number[] = [0,1,2,3,4,5,6]) {
    const uniqueSorted = Array.from(new Set(dates)).sort();
    const set = new Set(uniqueSorted);
    
    let current = 0;
    let cursor = new Date(todayKey);
    const cursorStr = this.toDateKey(cursor);
    
    // Safety check: if today is a working day and it's missed, does the streak break? 
    // Usually we only break it if yesterday was missed.
    // For a robust calculation backwards:
    let isFirstDay = true;
    while (true) {
      const dayOfWeek = cursor.getDay();
      const dateStr = this.toDateKey(cursor);
      
      if (set.has(dateStr)) {
        current++;
      } else {
        if (selectedDays.includes(dayOfWeek)) {
          // If it's today and we haven't done it yet, we don't break the streak immediately
          if (isFirstDay && dateStr === todayKey) {
            // Keep going, wait to see if yesterday was done
          } else {
            break; // Streak broken because a selected day was missed
          }
        }
        // If it's not a selected day, we missed it but it doesn't break the streak.
      }
      isFirstDay = false;
      cursor.setDate(cursor.getDate() - 1);
      
      // Safety limit to prevent infinite loops (e.g. going back 5 years)
      if (current === 0 && !isFirstDay && dateStr !== todayKey && !set.has(dateStr) && (new Date(todayKey).getTime() - cursor.getTime() > 10 * DAY_MS)) {
        break; // If we go back 10 days and still 0, stop.
      }
    }

    // Longest streak calculation
    let longest = 0;
    let running = 0;
    
    // Re-evaluate longest streak accurately by walking forward from the oldest event
    if (uniqueSorted.length > 0) {
      const start = new Date(uniqueSorted[0]);
      const end = new Date(uniqueSorted[uniqueSorted.length - 1]);
      let tempCursor = new Date(start);
      
      while (tempCursor <= end) {
        const tempDayOfWeek = tempCursor.getDay();
        const tempDateStr = this.toDateKey(tempCursor);
        
        if (set.has(tempDateStr)) {
          running++;
          longest = Math.max(longest, running);
        } else {
          if (selectedDays.includes(tempDayOfWeek)) {
            running = 0; // Streak breaks only on missed selected days
          }
        }
        tempCursor.setDate(tempCursor.getDate() + 1);
      }
    }
    
    return { current, longest };
  }
};
