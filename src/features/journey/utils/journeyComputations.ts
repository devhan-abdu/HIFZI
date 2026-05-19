import { getPagesFromLog } from "@/src/features/hifz/utils/quran-logic";
import type { IHifzLog } from "@/src/features/hifz/types";
import { getJuzByPage } from "@/src/features/muraja/utils/quranMapping";
import type { ISurah } from "@/src/types";
import type { JourneyPlanType } from "../types";
import type {
  JourneyMilestone,
  JourneyOverview,
  JourneyPlanCard,
  JourneyPlanStatus,
  JourneySessionEntry,
  JourneyStats,
  JourneyTestStats,
} from "../types";

const TOTAL_QURAN_PAGES = 604;
const TOTAL_JUZ = 30;

type RawActivityLog = {
  id: number;
  date: string;
  activityType: string;
  planId: number | null;
  localRefId: number | null;
  minutesSpent: number;
  unitsCompleted: number;
  note: string | null;
  metadata: string | null;
  updatedAt: string | null;
};

type ParsedMeta = {
  eventType?: string;
  sourceDate?: string;
  reference?: string | null;
  recordedAt?: string;
};

export function parseLogMetadata(metadata: string | null): ParsedMeta {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as ParsedMeta;
  } catch {
    return {};
  }
}

function planStatusRank(status: JourneyPlanStatus): number {
  if (status === "active") return 0;
  if (status === "paused") return 1;
  return 2;
}

export function sortJourneyPlans(plans: JourneyPlanCard[]): JourneyPlanCard[] {
  return [...plans].sort((a, b) => {
    const rank = planStatusRank(a.status) - planStatusRank(b.status);
    if (rank !== 0) return rank;
    return (b.startDate ?? "").localeCompare(a.startDate ?? "");
  });
}

type HifzLogForMemorization = {
  hifzPlanId: number;
  actualStartPage: number;
  actualEndPage: number;
  actualPagesCompleted: number;
  status: string;
  date: string;
};

/** Unique mushaf pages memorized (Hifz logs only), respecting plan direction. */
export function uniqueMemorizedPagesFromHifz(
  logs: HifzLogForMemorization[],
  planDirections: Map<number, "forward" | "backward">,
  surah: ISurah[],
): Set<number> {
  const pages = new Set<number>();
  for (const log of logs) {
    if (log.status !== "completed" && log.status !== "partial") continue;
    const direction = planDirections.get(log.hifzPlanId) ?? "forward";
    const expanded = getPagesFromLog(
      {
        actualStartPage: log.actualStartPage,
        actualEndPage: log.actualEndPage,
        actualPagesCompleted: log.actualPagesCompleted,
        status: log.status,
      } as IHifzLog,
      direction,
      surah,
    );
    expanded.forEach((p) => pages.add(p));
  }
  return pages;
}

function juzCountFromPages(pages: Set<number>): number {
  if (pages.size === 0) return 0;
  const juzSet = new Set<number>();
  pages.forEach((p) => juzSet.add(getJuzByPage(p)));
  return juzSet.size;
}

export function computeOverview(params: {
  activityPlanDates: string[];
  hifzLogs: HifzLogForMemorization[];
  planDirections: Map<number, "forward" | "backward">;
  surah: ISurah[];
  completionDates: string[];
  planCount: number;
}): JourneyOverview {
  const memorizedPages = uniqueMemorizedPagesFromHifz(
    params.hifzLogs,
    params.planDirections,
    params.surah,
  );
  const sortedDates = [...params.activityPlanDates].filter(Boolean).sort();
  const journeyStart = sortedDates[0] ?? null;
  const streakDates = [...params.completionDates].sort();

  return {
    juzMemorized: juzCountFromPages(memorizedPages),
    quranPercent: Math.min(
      100,
      Math.round((memorizedPages.size / TOTAL_QURAN_PAGES) * 100),
    ),
    journeyStartDate: journeyStart,
    totalDaysActive: new Set(params.completionDates).size,
    totalPlans: params.planCount,
    uniquePagesMemorized: memorizedPages.size,
    currentStreak: computeCurrentStreak(streakDates),
    bestStreak: computeLongestStreak(streakDates),
  };
}

export function mapActivityPlanStatus(
  activityStatus: string,
  entityStatus: string | null,
): JourneyPlanStatus {
  if (activityStatus === "completed") return "finished";
  if (entityStatus === "paused" || activityStatus === "paused") return "paused";
  return "active";
}

export function buildHifzPlanCard(
  activityPlan: {
    id: number;
    localRefId: number | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  },
  hifzPlan: {
    id: number;
    totalPages: number;
    startDate: string;
    status: string;
    startSurah: number;
  },
  completedPages: number,
  surah: ISurah[],
  startSurahName: string,
  endSurahName: string,
): JourneyPlanCard {
  const progress = hifzPlan.totalPages
    ? Math.min(100, Math.round((completedPages / hifzPlan.totalPages) * 100))
    : 0;

  return {
    id: hifzPlan.id,
    activityPlanId: activityPlan.id,
    localRefId: activityPlan.localRefId ?? hifzPlan.id,
    type: "HIFZ",
    name: `${startSurahName} – ${endSurahName}`,
    status: mapActivityPlanStatus(activityPlan.status, hifzPlan.status),
    progressPercent: progress,
    pagesDone: completedPages,
    pagesTotal: hifzPlan.totalPages,
    juzLabel: null,
    startDate: activityPlan.startDate ?? hifzPlan.startDate,
    endDate:
      activityPlan.status === "completed"
        ? activityPlan.endDate
        : activityPlan.endDate ?? null,
  };
}

export function buildMurajaPlanCard(
  activityPlan: {
    id: number;
    localRefId: number | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  },
  murajaPlan: {
    id: number;
    startPage: number | null;
    endPage: number | null;
    weekStartDate: string | null;
    weekEndDate: string | null;
    isActive: boolean | null;
  },
  completedPages: number,
  startSurahName: string,
  endSurahName: string,
): JourneyPlanCard {
  const start = murajaPlan.startPage ?? 1;
  const end = murajaPlan.endPage ?? start;
  const total = Math.max(1, end - start + 1);
  const pagesDone = Math.min(total, completedPages);

  return {
    id: murajaPlan.id,
    activityPlanId: activityPlan.id,
    localRefId: activityPlan.localRefId ?? murajaPlan.id,
    type: "MURAJA",
    name: `${startSurahName} – ${endSurahName}`,
    status: mapActivityPlanStatus(
      activityPlan.status,
      murajaPlan.isActive ? "active" : "paused",
    ),
    progressPercent: Math.min(100, Math.round((pagesDone / total) * 100)),
    pagesDone,
    pagesTotal: total,
    juzLabel: `Juz ${getJuzByPage(start)}–${getJuzByPage(end)}`,
    startDate: activityPlan.startDate ?? murajaPlan.weekStartDate,
    endDate:
      activityPlan.status === "completed"
        ? activityPlan.endDate ?? murajaPlan.weekEndDate
        : murajaPlan.weekEndDate,
  };
}

export function extractCompletionDates(logs: RawActivityLog[]): string[] {
  return Array.from(
    new Set(
      logs
        .filter((l) => {
          const meta = parseLogMetadata(l.metadata);
          return (meta.eventType ?? "").includes("_COMPLETED") && l.unitsCompleted > 0;
        })
        .map((l) => parseLogMetadata(l.metadata).sourceDate ?? l.date),
    ),
  ).sort();
}

export function computeJourneyStats(params: {
  hifzPages: number;
  murajaPages: number;
  completionDates: string[];
  totalSessions: number;
}): JourneyStats {
  const streakDates = [...params.completionDates].sort();
  return {
    totalSessions: params.totalSessions,
    totalPagesLogged: params.hifzPages + params.murajaPages,
    hifzPages: params.hifzPages,
    murajaPages: params.murajaPages,
    currentStreak: computeCurrentStreak(streakDates),
    bestStreak: computeLongestStreak(streakDates),
  };
}

export function computeTestStats(
  tests: {
    score: number;
    totalQuestions: number;
    date: string;
    type: string;
  }[],
): JourneyTestStats {
  if (tests.length === 0) {
    return {
      totalTests: 0,
      averageScorePercent: 0,
      lastTestDate: null,
      perfectTests: 0,
      hifzTests: 0,
      murajaTests: 0,
    };
  }

  const percents = tests.map((t) =>
    t.totalQuestions > 0 ? (t.score / t.totalQuestions) * 100 : 0,
  );
  const averageScorePercent = Math.round(
    percents.reduce((sum, p) => sum + p, 0) / percents.length,
  );

  return {
    totalTests: tests.length,
    averageScorePercent,
    lastTestDate: tests[0]?.date ?? null,
    perfectTests: tests.filter(
      (t) => t.totalQuestions > 0 && t.score === t.totalQuestions,
    ).length,
    hifzTests: tests.filter((t) => t.type === "HIFZ").length,
    murajaTests: tests.filter((t) => t.type === "MURAJA").length,
  };
}

function streakReachedDate(sortedDates: string[], threshold: number): string | null {
  if (sortedDates.length < threshold) return null;
  let prev: Date | null = null;
  let current = 0;
  for (const d of sortedDates) {
    const date = new Date(d);
    if (!prev) current = 1;
    else {
      const diff = Math.round((date.getTime() - prev.getTime()) / 86400000);
      current = diff === 1 ? current + 1 : 1;
    }
    if (current >= threshold) return d;
    prev = date;
  }
  return null;
}

function sessionMilestoneDate(sortedDates: string[], target: number): string | null {
  if (sortedDates.length < target) return null;
  return sortedDates[target - 1];
}

function computeCurrentStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  const set = new Set(sortedDates);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let cursorStr = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (!cursorStr) return 0;

  let streak = 0;
  const cursor = new Date(cursorStr);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeLongestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  let longest = 0;
  let current = 0;
  let prev: Date | null = null;
  for (const d of sortedDates) {
    const date = new Date(d);
    if (!prev) {
      current = 1;
    } else {
      const diff = Math.round((date.getTime() - prev.getTime()) / 86400000);
      current = diff === 1 ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    prev = date;
  }
  return longest;
}

export function isRelevantSessionLog(log: RawActivityLog): boolean {
  if (log.activityType !== "HIFZ" && log.activityType !== "MURAJA") return false;
  const meta = parseLogMetadata(log.metadata);
  const event = meta.eventType ?? "";
  return event.includes("_COMPLETED") || event === "TASK_MISSED";
}

export function sortSessionLogs(logs: RawActivityLog[]): RawActivityLog[] {
  return [...logs].sort((a, b) => {
    const metaA = parseLogMetadata(a.metadata);
    const metaB = parseLogMetadata(b.metadata);
    const tsA = metaA.recordedAt ?? a.updatedAt ?? a.date;
    const tsB = metaB.recordedAt ?? b.updatedAt ?? b.date;
    return tsB.localeCompare(tsA);
  });
}

export function buildSessionTimeline(
  logs: RawActivityLog[],
  planNames: Map<string, string>,
): JourneySessionEntry[] {
  const sessions: JourneySessionEntry[] = [];

  for (const log of logs) {
    if (!isRelevantSessionLog(log)) continue;

    const meta = parseLogMetadata(log.metadata);
    const eventType = meta.eventType ?? "";
    const date = meta.sourceDate ?? log.date;
    const isMissed = eventType === "TASK_MISSED";

    const planKey = `${log.activityType}:${log.localRefId ?? "na"}`;
    const planName = planNames.get(planKey) ?? "Quran session";

    sessions.push({
      id: log.id,
      date,
      timestamp: meta.recordedAt ?? log.updatedAt ?? log.date,
      activityType: log.activityType as JourneyPlanType,
      planName,
      reference: meta.reference ?? "Session",
      durationMinutes: log.minutesSpent ?? 0,
      qualityScore: null,
      pagesCompleted: log.unitsCompleted ?? 0,
      isMissed,
    });
  }

  return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function enrichSessionsWithQuality(
  sessions: JourneySessionEntry[],
  hifzByDate: Map<string, number>,
  murajaByDate: Map<string, number>,
): JourneySessionEntry[] {
  return sessions.map((s) => {
    if (s.isMissed) return s;
    const key = `${s.activityType}:${s.date}`;
    const score =
      s.activityType === "HIFZ"
        ? hifzByDate.get(key)
        : s.activityType === "MURAJA"
          ? murajaByDate.get(key)
          : undefined;
    return { ...s, qualityScore: score ?? s.qualityScore };
  });
}

export function computeMilestones(params: {
  hifzLogs: HifzLogForMemorization[];
  planDirections: Map<number, "forward" | "backward">;
  surah: ISurah[];
  completionDates: string[];
  sessionCount: number;
  bestStreak: number;
}): JourneyMilestone[] {
  const pages = uniqueMemorizedPagesFromHifz(
    params.hifzLogs,
    params.planDirections,
    params.surah,
  );
  const juzCount = juzCountFromPages(pages);
  const sortedCompletions = [...params.completionDates].sort();

  const milestones: JourneyMilestone[] = [];

  const firstJuzDate = params.hifzLogs
    .filter((l) => {
      if (l.status !== "completed" && l.status !== "partial") return false;
      const direction = params.planDirections.get(l.hifzPlanId) ?? "forward";
      return getPagesFromLog(
        {
          actualStartPage: l.actualStartPage,
          actualEndPage: l.actualEndPage,
          actualPagesCompleted: l.actualPagesCompleted,
          status: l.status,
        } as IHifzLog,
        direction,
        params.surah,
      ).some((p) => getJuzByPage(p) === 1);
    })
    .map((l) => l.date)
    .sort()[0];

  if (firstJuzDate) {
    milestones.push({
      id: "first-juz",
      icon: "book-outline",
      title: "First juz secured",
      achievedAt: firstJuzDate,
    });
  }

  const streakDate = streakReachedDate(sortedCompletions, 7);
  if (params.bestStreak >= 7 && streakDate) {
    milestones.push({
      id: "best-streak",
      icon: "flame-outline",
      title: `${params.bestStreak}-day streak`,
      achievedAt: streakDate,
    });
  }

  const halfQuranDate = params.hifzLogs
    .filter((l) => {
      if (l.status !== "completed" && l.status !== "partial") return false;
      const direction = params.planDirections.get(l.hifzPlanId) ?? "forward";
      const logPages = getPagesFromLog(
        {
          actualStartPage: l.actualStartPage,
          actualEndPage: l.actualEndPage,
          actualPagesCompleted: l.actualPagesCompleted,
          status: l.status,
        } as IHifzLog,
        direction,
        params.surah,
      );
      return logPages.some((p) => getJuzByPage(p) >= 15);
    })
    .map((l) => l.date)
    .sort()[0];

  if (juzCount >= 15 && halfQuranDate) {
    milestones.push({
      id: "half-quran",
      icon: "moon-outline",
      title: "Half Quran reached",
      achievedAt: halfQuranDate,
    });
  }

  for (const target of [50, 100, 500]) {
    const achievedAt = sessionMilestoneDate(sortedCompletions, target);
    if (params.sessionCount >= target && achievedAt) {
      milestones.push({
        id: `sessions-${target}`,
        icon: "checkmark-done-circle-outline",
        title: `${target} sessions logged`,
        achievedAt,
      });
    }
  }

  return milestones.sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));
}

export const JOURNEY_CONSTANTS = { TOTAL_JUZ, TOTAL_QURAN_PAGES };
