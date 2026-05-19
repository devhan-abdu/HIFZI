import type { Ionicons } from "@expo/vector-icons";

export type JourneyPlanStatus = "active" | "paused" | "finished";

export type JourneyPlanType = "HIFZ" | "MURAJA";

export interface JourneyOverview {
  juzMemorized: number;
  quranPercent: number;
  journeyStartDate: string | null;
  totalDaysActive: number;
  totalPlans: number;
  uniquePagesMemorized: number;
  currentStreak: number;
  bestStreak: number;
}

export interface JourneyPlanCard {
  id: number;
  activityPlanId: number;
  localRefId: number;
  type: JourneyPlanType;
  name: string;
  status: JourneyPlanStatus;
  progressPercent: number;
  pagesDone: number;
  pagesTotal: number;
  juzLabel: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface JourneyStats {
  totalSessions: number;
  totalPagesLogged: number;
  hifzPages: number;
  murajaPages: number;
  currentStreak: number;
  bestStreak: number;
}

export interface JourneyTestStats {
  totalTests: number;
  averageScorePercent: number;
  lastTestDate: string | null;
  perfectTests: number;
  hifzTests: number;
  murajaTests: number;
}

export interface JourneySessionEntry {
  id: number;
  date: string;
  timestamp: string;
  activityType: JourneyPlanType;
  planName: string;
  reference: string;
  durationMinutes: number;
  qualityScore: number | null;
  pagesCompleted: number;
  isMissed: boolean;
}

export interface JourneyMilestone {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  achievedAt: string;
}

export interface JourneyData {
  overview: JourneyOverview;
  stats: JourneyStats;
  testStats: JourneyTestStats;
  plans: JourneyPlanCard[];
  sessions: JourneySessionEntry[];
  totalSessions: number;
  milestones: JourneyMilestone[];
}
