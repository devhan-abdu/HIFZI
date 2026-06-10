import { db } from "@/src/lib/db/local-client";
import { userStats } from "@/src/features/user/database/userSchema";
import { habitEvents, notifications, scheduledNotifications } from "../database/notificationSchema";
import { activityPlans } from "@/src/features/habits/database/habitSchema";
import { weeklyMurajaPlans } from "@/src/features/muraja/database/murajaSchema";
import { hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { notificationRepository } from "./notificationRepository";
import { notificationManager } from "./notificationManager";
import { eq, and, sql } from "drizzle-orm";
import { supabase } from "@/src/lib/supabase";
import { COMEBACK_TEMPLATES, STREAK_WARNING_TEMPLATES } from "../../gamification/constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_RISK_HOUR = 18;

const schedulingLocks = new Set<string>();

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
    rewards?: any;
  }) {
    const xpGained = payload.rewards?.xpAwarded ?? (payload.status === 'completed' ? 50 : (payload.status === 'partial' ? 20 : 0));
    const todayKey = this.toDateKey();

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
    
    const currentStats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, payload.userId)
    });

    const totalXp = currentStats?.totalXp ?? xpGained;
    const level = currentStats?.level ?? Math.floor(totalXp / 1000);

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

    // Check if user is returning from a 3+ planned day miss
    let isComeback = false;
    if (payload.status !== 'missed') {
      const successfulEvents = allEvents
        .filter(e => e.habitType === payload.habitType && e.date < payload.date && e.status !== 'missed')
        .sort((a, b) => b.date.localeCompare(a.date));
      
      if (successfulEvents.length > 0) {
        const lastSuccessDateStr = successfulEvents[0].date;
        const lastSuccess = new Date(lastSuccessDateStr + 'T00:00:00');
        const today = new Date(payload.date + 'T00:00:00');
        
        let missedPlannedCount = 0;
        let cursor = new Date(lastSuccess);
        cursor.setDate(cursor.getDate() + 1);
        
        while (cursor < today) {
          const cursorStr = cursor.toISOString().split('T')[0];
          const dayOfWeek = (cursor.getDay() + 6) % 7;
          if (selectedDays.includes(dayOfWeek)) {
            const logOnDay = allEvents.find(e => e.habitType === payload.habitType && e.date === cursorStr);
            if (!logOnDay || logOnDay.status === 'missed') {
              missedPlannedCount++;
            }
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        
        if (missedPlannedCount >= 3) {
          isComeback = true;
        }
      }
    }

    if (payload.status !== 'missed') {
      await this.sendConsolidatedNotification(payload.userId, {
        displayName: payload.displayName ?? "Hafiz",
        streak: streaks.current,
        levelUp: payload.rewards?.levelUp,
        badges: payload.rewards?.badges,
        habitType: payload.habitType,
        isComeback
      });
    }

    await this.refreshSchedules(payload.userId);
    void this.syncWithRemote(payload.userId);
  },

  async removeHabitEvent(userId: string, habitType: 'hifz' | 'muraja', date: string) {
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
    const level = Math.floor(totalXp / 1000); // Align perfectly to 1000 XP per level

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
    isComeback?: boolean;
  }) {
    let title = "Great Work!";
    let message = `You've completed your ${data.habitType} session. Keep it up!`;
    let type: 'milestone' | 'warning' | 'xp' = 'milestone';
    // Use a millisecond timestamp as a nonce so eventKey is always unique and
    // never silently dropped by the (userId, eventKey) unique constraint.
    const nonce = Date.now();

    // Priority 1: Comeback Celebration!
    if (data.isComeback) {
      title = "Welcome Back!";
      const templates = [
        `Mashallah, ${data.displayName}! You're back! Let's build a beautiful habit again.`,
        `Mubarak on restarting your Quran journey! We are so happy to see you again.`,
        `Every step back to the Quran is a victory. Welcome back, ${data.displayName}!`
      ];
      message = templates[Math.floor(Math.random() * templates.length)];
      const eventKey = `comeback_celebration:${data.habitType}:${this.toDateKey()}:${nonce}`;

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
          data: { userId, type, eventKey, title: result.title, message: result.body }
        });
      }
      return;
    }

    // Priority 2: Badges — send a push for EACH badge individually so none are lost
    if (data.badges && data.badges.length > 0) {
      for (let i = 0; i < data.badges.length; i++) {
        const badge = data.badges[i];
        const badgeTitle = "New Badge Earned!";
        let badgeMessage = `Mubarak! You've earned the ${badge.badgeName} badge.`;
        // Only append extras to the first badge notification
        if (i === 0) {
          if (data.levelUp) badgeMessage += ` You also reached Level ${data.levelUp}!`;
          else if (data.streak > 0 && data.streak % 5 === 0) badgeMessage += ` On your ${data.streak}-day streak!`;
        }
        // Each badge gets a unique eventKey via its own timestamp offset
        const badgeEventKey = `badge:${badge.badgeType}:${this.toDateKey()}:${nonce + i}`;

        const result = await notificationRepository.createNotification(userId, {
          type: 'milestone',
          title: badgeTitle,
          message: badgeMessage,
          eventKey: badgeEventKey
        });
        if (result) {
          await notificationManager.sendLocal({
            title: result.title,
            body: result.body,
            data: { userId, type: 'milestone', eventKey: badgeEventKey, title: result.title, message: result.body }
          });
        }
      }
      return;
    }

    // Priority 3: Level Up
    if (data.levelUp) {
      title = "Level Up!";
      const templates = [
        `Mubarak! You've reached Level ${data.levelUp}! Keep ascending.`,
        `Amazing! You are now Level ${data.levelUp}. Your dedication is inspiring.`,
        `Level Up! ${data.levelUp} looks great on you. Keep going!`
      ];
      message = templates[Math.floor(Math.random() * templates.length)];
      if (data.streak > 0 && data.streak % 5 === 0) message += ` - ${data.streak}-day streak!`;
      const eventKey = `levelup:${data.levelUp}:${this.toDateKey()}:${nonce}`;

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
          data: { userId, type, eventKey, title: result.title, message: result.body }
        });
      }
      return;
    }

    // Priority 4: Streak Milestone
    if (data.streak > 0 && data.streak % 5 === 0) {
      title = "Streak Milestone";
      const templates = [
        `${data.displayName}! You're on a ${data.streak}-day streak! Keep going!`,
        `Consistency is key! ${data.streak} days and counting. Mubarak!`,
        `Mashallah! A ${data.streak}-day streak. You're becoming a Muraja master.`
      ];
      message = templates[Math.floor(Math.random() * templates.length)];
      const eventKey = `milestone:${data.streak}:${this.toDateKey()}:${nonce}`;

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
          data: { userId, type, eventKey, title: result.title, message: result.body }
        });
      }
      return;
    }

    // None of the above conditions met — no notification sent
  },

  async refreshSchedules(userId: string) {
    const now = new Date();
    const todayKey = this.toDateKey(now);
    
    // Concurrency Lock to prevent duplicate background runs at the exact same millisecond
    const lockKey = `${userId}:${todayKey}`;
    if (schedulingLocks.has(lockKey)) return;
    schedulingLocks.add(lockKey);

    try {
      const expired = await notificationRepository.getExpiredSchedules(userId, todayKey);
      for (const row of expired) {
        if (row.notificationIdentifier) await notificationManager.cancel(row.notificationIdentifier);
        await notificationRepository.deleteScheduledNotification(userId, row.eventKey);
      }

      await this.scheduleSmartReminders(userId, now);
    } finally {
      schedulingLocks.delete(lockKey);
    }
  },

  async scheduleSmartReminders(userId: string, now: Date) {
    const todayKey = this.toDateKey(now);
    const unifiedKey = `schedule:risk:unified:${todayKey}`;

    // Cleanup legacy separate notifications if any exist
    for (const legacyHabit of ['hifz', 'muraja']) {
      const legacyKey = `schedule:risk:${legacyHabit}:${todayKey}`;
      const existing = await notificationRepository.getScheduledNotification(userId, legacyKey);
      if (existing?.notificationIdentifier) await notificationManager.cancel(existing.notificationIdentifier);
      await notificationRepository.deleteScheduledNotification(userId, legacyKey);
    }

    const allEvents = await notificationRepository.getHabitEvents(userId);
    
    // 1. Cancel and delete unified streak-risk warning if user has logged *either* plan successfully today.
    const hasLoggedAnyToday = allEvents.some(e => e.date === todayKey && e.status !== 'missed');
    if (hasLoggedAnyToday) {
      const existing = await notificationRepository.getScheduledNotification(userId, unifiedKey);
      if (existing?.notificationIdentifier) await notificationManager.cancel(existing.notificationIdentifier);
      await notificationRepository.deleteScheduledNotification(userId, unifiedKey);
      return;
    }

    // 2. Fetch the plans to verify if today is a planned study day for EITHER plan.
    const activeMuraja = await db.query.weeklyMurajaPlans.findFirst({
      where: and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.isActive, true)),
    });
    const activeHifz = await db.query.hifzPlans.findFirst({
      where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')),
    });
    
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0 ... Sun=6

    const parseDays = (selectedDays: any): number[] => {
      if (!selectedDays) return [];
      if (typeof selectedDays === "string") {
        try { return JSON.parse(selectedDays); } catch { return []; }
      }
      return selectedDays;
    };

    const isMurajaPlanned = activeMuraja ? parseDays(activeMuraja.selectedDays).includes(dayOfWeek) : false;
    const isHifzPlanned = activeHifz ? parseDays(activeHifz.selectedDays).includes(dayOfWeek) : false;
    
    const isPlannedToday = isMurajaPlanned || isHifzPlanned;

    // If today is NOT a planned day for either plan, we do not schedule streak risk!
    if (!isPlannedToday) {
      const existing = await notificationRepository.getScheduledNotification(userId, unifiedKey);
      if (existing?.notificationIdentifier) await notificationManager.cancel(existing.notificationIdentifier);
      await notificationRepository.deleteScheduledNotification(userId, unifiedKey);
      return;
    }

    // 3. Streak risk warning is only meaningful if there is actually a streak > 0 to protect!
    const currentStats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId)
    });
    const hifzStreak = currentStats?.hifzCurrentStreak ?? 0;
    const murajaStreak = currentStats?.murajaCurrentStreak ?? 0;
    const hasActiveStreak = hifzStreak > 0 || murajaStreak > 0;

    if (!hasActiveStreak) {
      return;
    }

    const triggerDate = new Date(now);
    triggerDate.setHours(STREAK_RISK_HOUR, 0, 0, 0);

    if (now.getTime() < triggerDate.getTime()) {
      const existing = await notificationRepository.getScheduledNotification(userId, unifiedKey);
      if (!existing) {
        const body = STREAK_WARNING_TEMPLATES[Math.floor(Math.random() * STREAK_WARNING_TEMPLATES.length)];
        const identifier = await notificationManager.schedule({
          title: "Streak Risk!",
          body,
          data: { 
            userId, 
            type: 'warning', 
            eventKey: unifiedKey,
            title: "Streak Risk!",
            message: body
          },
          trigger: triggerDate
        });
        
        if (identifier) {
          await notificationRepository.upsertScheduledNotification(userId, {
            kind: 'streak_risk',
            habitType: isHifzPlanned ? 'hifz' : 'muraja',
            eventKey: unifiedKey,
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

    // ── Parse date string safely in LOCAL timezone (not UTC) ──────────────────
    const parseLocal = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d); // local midnight — no UTC shift
    };

    // ── Normalize day-of-week: JS getDay() = Sun=0…Sat=6
    //    App selectedDays convention  = Mon=0…Sun=6
    const toAppDay = (jsDay: number) => (jsDay + 6) % 7;

    // ── Current streak: walk backwards from today ─────────────────────────────
    let current = 0;
    const todayDate = parseLocal(todayKey);

    // Start from yesterday if today has no log yet (grace: today is not yet over)
    let cursor = new Date(todayDate);
    if (!set.has(todayKey)) {
      // Today is a planned day but not logged yet — check from yesterday
      // (the streak may still be alive from yesterday)
      cursor.setDate(cursor.getDate() - 1);
    }

    for (let guard = 0; guard < 730; guard++) {
      const appDay = toAppDay(cursor.getDay());
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;

      if (set.has(dateStr)) {
        current++; // This day was logged — streak continues
      } else {
        if (selectedDays.includes(appDay)) {
          break; // A required day was missed — streak is broken
        }
        // Rest/non-planned day — skip without breaking streak
      }
      cursor.setDate(cursor.getDate() - 1);

      // Safety: if we've gone back 10 days with zero count, stop early
      if (current === 0 && guard > 10) break;
    }

    // ── Longest streak: walk forward through all logged dates ─────────────────
    let longest = 0;
    let running = 0;

    if (uniqueSorted.length > 0) {
      const start = parseLocal(uniqueSorted[0]);
      const end = parseLocal(uniqueSorted[uniqueSorted.length - 1]);
      const tempCursor = new Date(start);

      while (tempCursor <= end) {
        const appDay = toAppDay(tempCursor.getDay());
        const tempDateStr = `${tempCursor.getFullYear()}-${String(tempCursor.getMonth() + 1).padStart(2, '0')}-${String(tempCursor.getDate()).padStart(2, '0')}`;

        if (set.has(tempDateStr)) {
          running++;
          longest = Math.max(longest, running);
        } else {
          if (selectedDays.includes(appDay)) {
            running = 0; // Missed a required day — reset
          }
          // Rest day — no reset
        }
        tempCursor.setDate(tempCursor.getDate() + 1);
      }
    }

    return { current, longest };
  }
};
