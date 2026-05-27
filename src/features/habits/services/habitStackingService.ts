import { db } from "@/src/lib/db/local-client";
import { weeklyMurajaPlans } from "@/src/features/muraja/database/murajaSchema";
import { hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { activityLogs } from "@/src/features/habits/database/habitSchema";
import { eq, and, desc, not } from "drizzle-orm";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const SOLAT_TIMES_DEFAULT: Record<string, { hour: number; minute: number }> = {
  fajr: { hour: 5, minute: 0 },
  dhuhr: { hour: 12, minute: 30 },
  asr: { hour: 15, minute: 45 },
  maghrib: { hour: 18, minute: 15 },
  isha: { hour: 19, minute: 30 },
};

// Dynamic Duolingo-style motivational templates
const MURAJA_TEMPLATES = [
  "Consistency is the crown of the Hafiz. Today's revision is waiting to keep your heart illuminated!",
  "Your revision is the shield of your Quran memorization. Let's protect it today!",
  "A page of Muraja keeps your path clear. 5 minutes today is all it takes to keep your memory strong!",
  "Don't let what you've built slip away. Let's refresh today's revision page together!",
];

const HIFZ_TEMPLATES = [
  "The journey of a thousand miles begins with a single step. Let's memorize today's new page!",
  "Your Quran is waiting for you today. Let's add a beautiful new verse to your chest!",
  "Every letter you memorize today is a light for your heart. Let's take today's new target!",
  "Elevate and recite. Let's make progress on your Hifz target today!",
];

const COMBINED_TEMPLATES = [
  "A double blessing today! Let's revise the old and welcome the new. You've got this!",
  "Revision first to strengthen the heart, then Hifz to elevate. Let's complete today's goals!",
  "Your crown is being woven with every page. Today's double target is waiting for you!",
];

const REST_TEMPLATES = [
  "A rest day for your plans, but a perfect day for reflection. Open the Quran and read for the soul today!",
  "Even a single ayah today keeps the heart connected. Let's check in for a quick reflection!",
  "Rest your mind, but keep your heart close. Your Quran journey is a lifelong companion.",
];

export const habitStackingService = {
  async getDynamicPreferredTime(userId: string, defaultHour: number, defaultMinute: number): Promise<{ hour: number, minute: number, isDynamic: boolean }> {
    try {
      const logs = await db.query.activityLogs.findMany({
        where: and(
          eq(activityLogs.userId, userId),
          not(eq(activityLogs.unitsCompleted, 0))
        ),
        orderBy: [desc(activityLogs.createdAt)],
        limit: 3,
      });

      if (logs.length >= 3) {
        const times = logs.map(l => {
          const d = new Date(l.createdAt);
          return d.getHours() * 60 + d.getMinutes();
        });

        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        if (maxTime - minTime <= 120) {
          const avgMinutes = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
          const dynamicHour = Math.floor(avgMinutes / 60);
          const dynamicMinute = avgMinutes % 60;
          return { hour: dynamicHour, minute: dynamicMinute, isDynamic: true };
        }
      }
    } catch (err) {
      console.error("Failed to calculate dynamic preferred time:", err);
    }
    return { hour: defaultHour, minute: defaultMinute, isDynamic: false };
  },

  async scheduleUnifiedReminders(userId: string) {
    if (!userId) return;

    // 1. Cancel all previously scheduled habit stacking notifications first
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.identifier.startsWith("habit_stacking_")) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (err) {
      console.error("Failed to cancel scheduled notifications:", err);
    }

    // 2. Fetch active plans
    const activeMuraja = await db.query.weeklyMurajaPlans.findFirst({
      where: and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.isActive, true)),
    });
    const activeHifz = await db.query.hifzPlans.findFirst({
      where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')),
    });

    const activePlan = activeMuraja || activeHifz;
    if (!activePlan) return;

    // 3. Extract preferred time and custom time settings
    const preferredTime = activePlan.preferredTime ?? "Isha";
    const isCustomTime = activePlan.isCustomTime ?? false;

    let hour = 19;
    let minute = 30;

    if (isCustomTime) {
      const match = preferredTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        hour = parseInt(match[1], 10);
        minute = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      } else {
        const parts = preferredTime.split(':');
        if (parts.length === 2) {
          hour = parseInt(parts[0], 10);
          minute = parseInt(parts[1], 10);
        }
      }
    } else {
      const time = SOLAT_TIMES_DEFAULT[preferredTime.toLowerCase().trim()];
      if (time) {
        hour = time.hour;
        minute = time.minute;
      }
    }

    const timing = await this.getDynamicPreferredTime(userId, hour, minute);
    console.log(`Preferred time: ${hour}:${minute}, Dynamic timing used: ${timing.isDynamic} (${timing.hour}:${timing.minute})`);

    const parseDays = (selectedDays: any): number[] => {
      if (!selectedDays) return [];
      if (typeof selectedDays === "string") {
        try {
          return JSON.parse(selectedDays) as number[];
        } catch {
          return [];
        }
      }
      return selectedDays as number[];
    };

    const murajaDays = parseDays(activeMuraja?.selectedDays);
    const hifzDays = parseDays(activeHifz?.selectedDays);

    for (let dbWeekday = 0; dbWeekday < 7; dbWeekday++) {
      const isMurajaScheduled = murajaDays.includes(dbWeekday);
      const isHifzScheduled = hifzDays.includes(dbWeekday);
      const expoWeekday = ((dbWeekday + 1) % 7) + 1;

      // Skip scheduling entirely if it's a rest day for BOTH plans (no notifications on rest days)
      if (!isMurajaScheduled && !isHifzScheduled) {
        continue;
      }

      let title = "Hifzi Journey";
      let body = "";
      let templates: string[] = [];

      if (isMurajaScheduled && isHifzScheduled) {
        title = "Dual Quran Target!";
        templates = COMBINED_TEMPLATES;
      } else if (isMurajaScheduled) {
        title = "Time for Muraja!";
        templates = MURAJA_TEMPLATES;
      } else {
        title = "Time for Hifz!";
        templates = HIFZ_TEMPLATES;
      }

      // Seed with week of the year so it rotates dynamically every week
      const weekOfYear = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      const templateIdx = (dbWeekday + weekOfYear) % templates.length;
      body = templates[templateIdx];

      const identifier = `habit_stacking_day_${expoWeekday}`;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'habit_stacking', isDynamic: timing.isDynamic },
            sound: true,
            ...(Platform.OS === "android" ? { channelId: "default" } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: expoWeekday,
            hour: timing.hour,
            minute: timing.minute,
          },
          identifier,
        });
      } catch (err) {
        console.error(`Failed to schedule notification for day ${expoWeekday}:`, err);
      }
    }

    console.log(`Successfully scheduled consolidated dynamic reminders at ${timing.hour}:${timing.minute}`);
  },

  async scheduleReminders(plan: { 
    id: number; 
    type: 'hifz' | 'muraja'; 
    preferredTime: string; 
    isCustomTime: boolean;
    selectedDays: number[];
  }) {
    // Legacy support: delegate to scheduleUnifiedReminders
    // Fetch user id from db based on plan ID
    try {
      let userId = "";
      if (plan.type === 'muraja') {
        const p = await db.query.weeklyMurajaPlans.findFirst({ where: eq(weeklyMurajaPlans.id, plan.id) });
        if (p && p.userId) userId = p.userId;
      } else {
        const p = await db.query.hifzPlans.findFirst({ where: eq(hifzPlans.id, plan.id) });
        if (p && p.userId) userId = p.userId;
      }
      if (userId) {
        await this.scheduleUnifiedReminders(userId);
      }
    } catch (err) {
      console.error("Failed to run scheduleReminders wrapper:", err);
    }
  },

  async cancelReminders(id: number, type: 'hifz' | 'muraja') {
    // Keep for backward compat, but we cancel all habit_stacking_ now
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.identifier.startsWith("habit_stacking_")) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (err) {
      console.error("Failed to cancel scheduled notifications:", err);
    }
  }
};
