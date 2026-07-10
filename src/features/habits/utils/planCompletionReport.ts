import { differenceInDays } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/src/lib/db/local-client";
import { pagePerformance, userBadges } from "@/src/features/user/database/userSchema";
import { hifzStatus, getHifzPlanEndDate } from "@/src/features/hifz/utils/plan-status";
import { countPlannedDaysElapsed } from "@/src/features/hifz/utils/plan-calculations";
import { calculateRetrievability } from "@/src/features/user/hooks/usePagePerformance";
import { getSurah } from "@/src/features/muraja/utils/quranMapping";
import type { IHifzPlan } from "@/src/features/hifz/types";
import type { ISurah } from "@/src/types";

const PLAN_MILESTONE_BADGES = [
  "SPARK",
  "QUARTER_FINISHER",
  "HALF_FINISHER",
  "PLAN_COMPLETE",
] as const;

export type PlanCompletionReport = {
  avgRate: number;
  consistencyRate: number;
  avgQuality: number;
  completedDays: number;
  partialDays: number;
  totalCompletedPages: number;
  planDurationDays: number;
  plannedStudyDays: number;
  missedDays: number;
  status: "Elite" | "Polishing" | "Recovery";
  isSingleSurah: boolean;
  surahName: string;
  atRiskPages: PageInsight[];
  solidPages: PageInsight[];
  surahAnalysis: SurahInsight[];
  achievedBadges: {
    badgeId: string;
    badgeType: string;
    achievedAt: string;
    metadata: string | null;
  }[];
  pagesRangeStr: string;
  planStartDate: string;
  planEndDate: string;
  highestStreak: number;
};

type PageInsight = {
  page: number;
  surahName: string;
  pageInSurah: number;
  status: "weak" | "strong" | "medium";
  retrievability: number;
  consecutivePerfects: number;
  lastSessionQuality: string | null;
};

type SurahInsight = {
  name: string;
  totalPages: number;
  weakPercent: number;
  strongPercent: number;
  status: "excellent" | "polish" | "good";
};

function calendarDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, differenceInDays(end, start) + 1);
}

function resolveConsistencyStatus(rate: number): PlanCompletionReport["status"] {
  if (rate >= 90) return "Elite";
  if (rate >= 70) return "Polishing";
  return "Recovery";
}

function getHifzPagesInRange(plan: IHifzPlan): number[] {
  const startPage = plan.startPage || 1;
  const totalPages = plan.totalPages || 0;
  const pages: number[] = [];

  if (plan.direction === "forward") {
    for (let i = 0; i < totalPages; i++) {
      const page = startPage + i;
      if (page >= 1 && page <= 604) pages.push(page);
    }
  } else {
    for (let i = 0; i < totalPages; i++) {
      const page = startPage - i;
      if (page >= 1 && page <= 604) pages.push(page);
    }
  }

  return pages;
}

function getMurajaPagesInRange(startPage: number, endPage: number): number[] {
  const minPage = Math.min(startPage, endPage);
  const maxPage = Math.max(startPage, endPage);
  const pages: number[] = [];
  for (let p = minPage; p <= maxPage; p++) pages.push(p);
  return pages;
}

async function loadPageInsights(
  userId: string,
  pagesInRange: number[],
  surahData: ISurah[],
): Promise<PageInsight[]> {
  if (pagesInRange.length === 0) return [];

  const performanceRows = await db
    .select({
      pageNumber: pagePerformance.pageNumber,
      stability: pagePerformance.stability,
      lastReviewedAt: pagePerformance.lastReviewedAt,
      consecutivePerfects: pagePerformance.consecutivePerfects,
      lastSessionQuality: pagePerformance.lastSessionQuality,
      lastMistakesCount: pagePerformance.lastMistakesCount,
    })
    .from(pagePerformance)
    .where(
      and(
        eq(pagePerformance.userId, userId),
        inArray(pagePerformance.pageNumber, pagesInRange),
      ),
    );

  const perfMap = new Map(performanceRows.map((r) => [r.pageNumber, r]));

  return pagesInRange.map((page) => {
    const perf = perfMap.get(page);
    const s = getSurah(page, surahData);
    const surahName = s?.englishName || "Unknown Surah";
    const pageInSurah = page - (s?.startingPage ?? 1) + 1;

    if (!perf?.lastReviewedAt) {
      return {
        page,
        surahName,
        pageInSurah,
        status: "weak" as const,
        retrievability: 0,
        consecutivePerfects: 0,
        lastSessionQuality: null,
      };
    }

    const retrievability = calculateRetrievability(
      perf.stability ?? 1,
      perf.lastReviewedAt,
    );
    const isWeak =
      perf.lastSessionQuality === "low" ||
      (perf.lastMistakesCount ?? 0) >= 4 ||
      retrievability < 0.7;
    const isStrong =
      (perf.consecutivePerfects ?? 0) >= 3 ||
      (retrievability >= 0.85 && perf.lastSessionQuality !== "low");

    return {
      page,
      surahName,
      pageInSurah,
      status: isWeak ? "weak" : isStrong ? "strong" : "medium",
      retrievability: Math.round(retrievability * 100),
      consecutivePerfects: perf.consecutivePerfects ?? 0,
      lastSessionQuality: perf.lastSessionQuality,
    };
  });
}

function buildSurahBreakdown(pageInsights: PageInsight[]) {
  const uniqueSurahNames = Array.from(new Set(pageInsights.map((p) => p.surahName)));
  const isSingleSurah = uniqueSurahNames.length === 1;

  let surahAnalysis: SurahInsight[] = [];
  let atRiskPages: PageInsight[] = [];
  let solidPages: PageInsight[] = [];

  if (isSingleSurah) {
    atRiskPages = pageInsights.filter((p) => p.status === "weak");
    solidPages = pageInsights.filter((p) => p.status === "strong");
  } else {
    const surahGroups = new Map<string, PageInsight[]>();
    pageInsights.forEach((p) => {
      if (!surahGroups.has(p.surahName)) surahGroups.set(p.surahName, []);
      surahGroups.get(p.surahName)!.push(p);
    });

    surahGroups.forEach((pages, name) => {
      const tot = pages.length;
      const weakCount = pages.filter((p) => p.status === "weak").length;
      const strongCount = pages.filter((p) => p.status === "strong").length;
      const weakPercent = Math.round((weakCount / tot) * 100);
      const strongPercent = Math.round((strongCount / tot) * 100);

      surahAnalysis.push({
        name,
        totalPages: tot,
        weakPercent,
        strongPercent,
        status:
          weakPercent > 30 ? "polish" : strongPercent >= 60 ? "excellent" : "good",
      });
    });
  }

  return { isSingleSurah, surahName: uniqueSurahNames[0] || "", atRiskPages, solidPages, surahAnalysis };
}

async function loadPlanBadges(
  userId: string,
  planId: number,
  planType: "HIFZ" | "MURAJA",
  startDate: string,
  endDate: string,
) {
  const rows = await db
    .select({
      badgeId: userBadges.badgeId,
      badgeType: userBadges.badgeType,
      achievedAt: userBadges.achievedAt,
      metadata: userBadges.metadata,
    })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  return rows.filter((badge) => {
    if (badge.metadata) {
      try {
        const meta = JSON.parse(badge.metadata);
        if (meta.planId === planId && meta.planType === planType) return true;
      } catch {
        // ignore malformed metadata
      }
    }

    const earnedDay = badge.achievedAt.slice(0, 10);
    const isMilestone = PLAN_MILESTONE_BADGES.includes(
      badge.badgeType as (typeof PLAN_MILESTONE_BADGES)[number],
    );
    return isMilestone && earnedDay >= startDate && earnedDay <= endDate;
  });
}

export async function buildHifzCompletionReport(
  plan: IHifzPlan,
  userId: string,
  surahData: ISurah[],
): Promise<PlanCompletionReport> {
  const planEndDate = getHifzPlanEndDate(plan);
  const endReference = new Date(planEndDate);
  endReference.setHours(0, 0, 0, 0);

  const status = hifzStatus(plan, surahData, endReference);
  if (!status) {
    throw new Error("Could not compute hifz completion stats");
  }

  const plannedStudyDays = countPlannedDaysElapsed(
    new Date(plan.startDate),
    endReference,
    plan.selectedDays,
  );

  const pagesInRange = getHifzPagesInRange(plan);
  const pageInsights = await loadPageInsights(userId, pagesInRange, surahData);
  const breakdown = buildSurahBreakdown(pageInsights);

  const achievedBadges = await loadPlanBadges(
    userId,
    plan.id!,
    "HIFZ",
    plan.startDate,
    planEndDate,
  );

  const endPage =
    plan.direction === "forward"
      ? plan.startPage + plan.totalPages - 1
      : plan.startPage - plan.totalPages + 1;

  let currentStreak = 0;
  let highestStreak = 0;
  
  const sortedLogs = [...(plan.hifzDailyLogs || [])]
    .filter(l => l.date && (l.status === 'completed' || l.status === 'partial' || l.status === 'missed'))
    .sort((a, b) => a.date!.localeCompare(b.date!));
    
  for (const log of sortedLogs) {
    if (log.status === 'completed' || log.status === 'partial') {
      currentStreak++;
      if (currentStreak > highestStreak) highestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return {
    avgRate: status.progress,
    consistencyRate: status.accuracy,
    avgQuality: status.avgQuality,
    completedDays: status.completedDays,
    partialDays: status.partialDays,
    totalCompletedPages: status.completedPages,
    planDurationDays: calendarDaysInclusive(plan.startDate, planEndDate),
    plannedStudyDays,
    missedDays: status.missedCount,
    status: resolveConsistencyStatus(status.accuracy),
    pagesRangeStr: `Pages ${plan.startPage} – ${endPage}`,
    planStartDate: plan.startDate,
    planEndDate,
    highestStreak,
    achievedBadges,
    ...breakdown,
  };
}

function getMurajaPlanEndDate(plan: {
  weekStartDate?: string | null;
  daily_logs?: { date: string | null; status: string | null }[];
}): string {
  const start = plan.weekStartDate || new Date().toISOString().slice(0, 10);
  const logs = plan.daily_logs ?? [];
  const successLogs = logs.filter(
    (l) =>
      l.date &&
      (l.status === "completed" || l.status === "partial"),
  );
  if (successLogs.length === 0) return start;
  return successLogs.reduce(
    (max, log) => (log.date! > max ? log.date! : max),
    start,
  );
}

export async function buildMurajaCompletionReport(
  plan: {
    id: number;
    startPage?: number | null;
    endPage?: number | null;
    weekStartDate?: string | null;
    selectedDays?: string | number[] | null;
    plannedPagesPerDay?: number | null;
    daily_logs?: {
      date: string | null;
      status: string | null;
      completed_pages?: number | null;
      quality_score?: number | null;
      qualityScore?: number | null;
    }[];
  },
  userId: string,
  surahData: ISurah[],
): Promise<PlanCompletionReport> {
  const logs = plan.daily_logs ?? [];
  const planStartDate = plan.weekStartDate || logs[0]?.date || todayIso();
  const planEndDate = getMurajaPlanEndDate(plan);
  const endReference = new Date(planEndDate);
  endReference.setHours(0, 0, 0, 0);

  const selectedDays: number[] =
    typeof plan.selectedDays === "string"
      ? JSON.parse(plan.selectedDays)
      : plan.selectedDays ?? [0, 1, 2, 3, 4, 5, 6];

  const plannedStudyDays = countPlannedDaysElapsed(
    new Date(planStartDate),
    endReference,
    selectedDays,
  );

  let completedDays = 0;
  let partialDays = 0;
  let totalCompletedPages = 0;
  let totalQuality = 0;
  let qualityCount = 0;

  for (const log of logs) {
    if (!log.date || !log.status) continue;
    if (log.status === "completed") completedDays++;
    else if (log.status === "partial") partialDays++;

    if (log.status === "completed" || log.status === "partial") {
      totalCompletedPages += log.completed_pages ?? 0;
      const q = log.quality_score ?? log.qualityScore;
      if (q) {
        totalQuality += q;
        qualityCount++;
      }
    }
  }

  const successDays = completedDays + partialDays;
  const effectiveMissed = Math.max(0, plannedStudyDays - successDays);
  const consistencyRate =
    plannedStudyDays > 0
      ? Math.min(100, Math.round((successDays / plannedStudyDays) * 100))
      : 100;

  const startPage = plan.startPage || 1;
  const endPage = plan.endPage || 1;
  const planPagesTotal = Math.abs(endPage - startPage) + 1;
  const avgRate =
    planPagesTotal > 0
      ? Math.min(100, Math.round((totalCompletedPages / planPagesTotal) * 100))
      : 100;

  const pagesInRange = getMurajaPagesInRange(startPage, endPage);
  const pageInsights = await loadPageInsights(userId, pagesInRange, surahData);
  const breakdown = buildSurahBreakdown(pageInsights);

  const achievedBadges = await loadPlanBadges(
    userId,
    plan.id,
    "MURAJA",
    planStartDate,
    planEndDate,
  );

  let currentStreak = 0;
  let highestStreak = 0;
  
  const sortedLogs = [...logs]
    .filter(l => l.date && (l.status === 'completed' || l.status === 'partial' || l.status === 'missed'))
    .sort((a, b) => a.date!.localeCompare(b.date!));
    
  for (const log of sortedLogs) {
    if (log.status === 'completed' || log.status === 'partial') {
      currentStreak++;
      if (currentStreak > highestStreak) highestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return {
    avgRate,
    consistencyRate,
    avgQuality:
      qualityCount > 0
        ? parseFloat((totalQuality / qualityCount).toFixed(1))
        : 0,
    completedDays,
    partialDays,
    totalCompletedPages,
    planDurationDays: calendarDaysInclusive(planStartDate, planEndDate),
    plannedStudyDays,
    missedDays: effectiveMissed,
    status: resolveConsistencyStatus(consistencyRate),
    pagesRangeStr: `Pages ${startPage} – ${endPage}`,
    planStartDate,
    planEndDate,
    highestStreak,
    achievedBadges,
    ...breakdown,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
