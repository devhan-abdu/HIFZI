import { notificationManager } from "../../notifications/services/notificationManager";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const SOLAT_TIMES_DEFAULT: Record<string, { hour: number; minute: number }> = {
  fajr: { hour: 5, minute: 0 },
  dhuhr: { hour: 12, minute: 30 },
  asr: { hour: 15, minute: 45 },
  maghrib: { hour: 18, minute: 15 },
  isha: { hour: 19, minute: 30 },
};

export const habitStackingService = {
  async scheduleReminders(plan: { 
    id: number; 
    type: 'hifz' | 'muraja'; 
    preferredTime: string; 
    isCustomTime: boolean;
    selectedDays: number[];
  }) {
    const { id, type, preferredTime, isCustomTime, selectedDays } = plan;
    if (!preferredTime || !selectedDays || selectedDays.length === 0) return;

    for (let day = 1; day <= 7; day++) {
      await Notifications.cancelScheduledNotificationAsync(`habit_stacking_${type}_${id}_day_${day}`);
    }

    let hour = 0;
    let minute = 0;

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
      const time = SOLAT_TIMES_DEFAULT[preferredTime.toLowerCase()];
      if (time) {
        hour = time.hour;
        minute = time.minute;
      }
    }

    const title = type === 'hifz' ? "Time for Hifz! 📖" : "Muraja Session! 🔄";
    const habitDescription = isCustomTime ? `at ${preferredTime}` : `after ${preferredTime}`;
    const body = `Habit Stacking: It's time for your session ${habitDescription}. Let's reach your goal!`;

    for (const dayOffset of selectedDays) {
   
      const expoWeekday = ((dayOffset + 1) % 7) + 1;
      const identifier = `habit_stacking_${type}_${id}_day_${expoWeekday}`;
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: { planId: id, type: 'habit_stacking', habitType: type },
              sound: true,
              ...(Platform.OS === "android" ? { channelId: "default" } : {}),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY, 
              weekday: expoWeekday,
              hour,
              minute,
            },
            identifier,
          });
    }

    console.log(`Scheduled ${selectedDays.length} reminders for ${type} plan ${id} at ${hour}:${minute}`);
  },

  async cancelReminders(id: number, type: 'hifz' | 'muraja') {
    const identifierKey = `habit_stacking_${type}_${id}`;
    await notificationManager.cancel(identifierKey);
  }
};
