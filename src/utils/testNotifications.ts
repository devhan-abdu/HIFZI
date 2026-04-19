import { SQLiteDatabase } from "expo-sqlite";
import {
  insertNotificationDirect,
  NotificationType,
} from "@/src/services/notificationService";

export async function sendTestNotification(
  db: SQLiteDatabase,
  userId: string,
  type: NotificationType,
) {
  const map: Record<NotificationType, { title: string; message: string }> = {
    xp: {
      title: "XP Test",
      message: "✨ Great job! You earned 50 XP. Only 10 XP to level up!",
    },
    warning: {
      title: "Streak Warning Test",
      message: "⚠️ Your streak is in danger! Complete Hifz before midnight!",
    },
    milestone: {
      title: "Milestone Test",
      message: "🔥 You're on a 5-day streak! Don't let it break!",
    },
  };

  const entry = map[type];
  await insertNotificationDirect(db, {
    userId,
    type,
    title: entry.title,
    message: entry.message,
    eventKey: `test:${type}:${Date.now()}`,
  });
  console.log("[TEST NOTIFICATION SENT]", type);
}
