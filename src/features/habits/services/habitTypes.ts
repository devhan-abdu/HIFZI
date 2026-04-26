export type ActivityType = "HIFZ" | "MURAJA" | "NORMAL_READING";
export type LegacyHabitType = "hifz" | "reading" | "review" | "understanding";
export type HabitType = ActivityType | LegacyHabitType;

export type ActivityEventType =
  | "HIFZ_COMPLETED"
  | "MURAJA_COMPLETED"
  | "NORMAL_READING_COMPLETED"
  | "TASK_UNDONE"
  | "TASK_MISSED";

export type HabitLogMetadata = {
  eventType?: ActivityEventType;
  sourceKey?: string;
  sourceDate?: string;
  status?: "completed" | "missed" | "undone";
  reference?: string | null;
  recordedAt?: string;
};

export type HabitHistoryEntry = {
  id: number;
  type: ActivityEventType;
  timestamp: string;
  activityType: ActivityType;
  date: string;
  reference: string | null;
  minutes: number;
  units: number;
};

export type HabitProgressSnapshot = {
  userHistory: Array<{
    date: string;
    status: "completed" | "partial" | "missed" | "pending";
  }>;
  weekHistory: [];
  historyEntries: HabitHistoryEntry[];
  heatmap: { date: string; count: number; minutes: number }[];
  reflections: {
    id: number;
    date: string;
    reflection_text: string;
    activity_type: string;
    verses_read: number;
  }[];
  analytics: {
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    totalMinutes: number;
    totalPages: number;
    completedCount: number;
    missedCount: number;
    revisionFrequency: number;
  };
  progressByType: Record<ActivityType, { minutes: number; units: number; sessions: number }>;
  activityHash: string;
  lastActivityAt: string | null;
};
