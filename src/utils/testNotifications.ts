import { notificationRepository } from "@/src/features/notifications/services/notificationRepository";

export async function sendTestNotification(
  userId: string,
  type: 'xp' | 'warning' | 'milestone',
) {
  const map: Record<string, { title: string; message: string }> = {
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
  await notificationRepository.createNotification(userId, {
    type,
    title: entry.title,
    message: entry.message,
    eventKey: `test:${type}:${Date.now()}`,
  });
  console.log("[TEST NOTIFICATION SENT]", type);
}
