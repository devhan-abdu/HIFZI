import { BadgeType } from "@/src/services/GamificationService";

export const GAMIFICATION_RANKS = [
  { maxLevel: 2, title: "Seeker", titleAr: "طالب" },
  { maxLevel: 5, title: "Committed", titleAr: "ملتزم" },
  { maxLevel: 10, title: "Guardian", titleAr: "حافظ" },
  { maxLevel: 20, title: "Master", titleAr: "متقن" },
  { maxLevel: Infinity, title: "Luminary", titleAr: "منير" },
];

export const getRankForLevel = (level: number) => {
  return GAMIFICATION_RANKS.find((rank) => level <= rank.maxLevel) || GAMIFICATION_RANKS[GAMIFICATION_RANKS.length - 1];
};

export const BADGE_DICTIONARY: Record<BadgeType, { title: string; description: string; icon: string; color: string }> = {
  "STREAK_3": {
    title: "Rising Habit",
    description: "You protected your daily habit for 3 consecutive days.",
    icon: "flame",
    color: "#f59e0b",
  },
  "STREAK_7": {
    title: "Shield of Consistency",
    description: "A full week of dedication. You protected your habit for 7 straight days.",
    icon: "shield-checkmark",
    color: "#10b981",
  },
  "STREAK_30": {
    title: "Iron Will",
    description: "30 days of unbroken consistency. A true guardian of the Quran.",
    icon: "trophy",
    color: "#8b5cf6",
  },
  "MUTQEEN_5": {
    title: "Flawless Memory",
    description: "You achieved a perfect quality score 5 times in a row.",
    icon: "star",
    color: "#fbbf24",
  },
  "QUARTER_FINISHER": {
    title: "Quarter Finisher",
    description: "You have completed 25% of your memorization plan.",
    icon: "pie-chart",
    color: "#3b82f6",
  },
  "HALF_FINISHER": {
    title: "Half Finisher",
    description: "You have completed 50% of your memorization plan. Halfway there!",
    icon: "pie-chart",
    color: "#2563eb",
  },
  "PLAN_COMPLETE": {
    title: "Plan Complete",
    description: "Mubarak! You have successfully completed your entire memorization plan.",
    icon: "medal",
    color: "#1d4ed8",
  },
  "MYSTERY_REWARD": {
    title: "Hidden Blessing",
    description: "A special reward for your dedication.",
    icon: "gift",
    color: "#ec4899",
  },
  "ELITE_PATH": {
    title: "Elite Path",
    description: "You consistently exceed expectations.",
    icon: "flash",
    color: "#f43f5e",
  },
  "RECOVERY_SHIELD": {
    title: "The Return",
    description: "We fall, but we rise again. You restored your habit after being away.",
    icon: "refresh-circle",
    color: "#06b6d4",
  },
  "SPARK": {
    title: "Initial Spark",
    description: "The journey of a thousand miles begins with a single step.",
    icon: "sunny",
    color: "#eab308",
  }
};

export const STREAK_WARNING_TEMPLATES = [
  "\"The most beloved deeds to Allah are the most consistent, even if small.\" Your Muraja is ready for today.",
  "Protect your streak! Even 5 minutes of Hifz today keeps the habit alive.",
  "Read and ascend. Your daily Quran session awaits.",
  "Don't let your streak fade away! A small effort today builds a mountain tomorrow.",
  "Your Quran journey needs you today. Keep the chain going!"
];

export const COMEBACK_TEMPLATES = [
  "We know life gets busy. Your Quran journey is waiting whenever you are ready.",
  "Every day is a new beginning. Ready to start again?",
  "The Quran is always there for you. Welcome back."
];
