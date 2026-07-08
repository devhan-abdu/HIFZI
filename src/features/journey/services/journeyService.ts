import { db } from "@/src/lib/db/local-client";
import { activityLogs, activityPlans } from "@/src/features/habits/database/habitSchema";
import { hifzLogs, hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { dailyMurajaLogs, weeklyMurajaPlans } from "@/src/features/muraja/database/murajaSchema";
import { testLogs } from "@/src/features/test/database/testSchema";
import { getSurahByPage, getSurahNameByNumber } from "@/src/features/muraja/utils/quranMapping";
import { userStats } from "@/src/features/user/database/userSchema";
import type { ISurah } from "@/src/types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  JourneyData,
  JourneyPlanCard,
  JourneySessionEntry,
} from "../types";
import {
  buildHifzPlanCard,
  buildMurajaPlanCard,
  buildSessionTimeline,
  computeJourneyStats,
  computeMilestones,
  computeOverview,
  computeTestStats,
  enrichSessionsWithQuality,
  extractCompletionDates,
  isRelevantSessionLog,
  sortJourneyPlans,
  sortSessionLogs,
} from "../utils/journeyComputations";

export const SESSION_PAGE_SIZE = 10;

export type JourneyOverviewResult = Omit<JourneyData, "sessions" | "totalSessions">;

function buildPlanDirections(
  hifzPlansList: { id: number; direction: string }[],
): Map<number, "forward" | "backward"> {
  const map = new Map<number, "forward" | "backward">();
  for (const p of hifzPlansList) {
    map.set(p.id, p.direction === "backward" ? "backward" : "forward");
  }
  return map;
}

function buildPlanNamesMap(plans: JourneyPlanCard[]): Map<string, string> {
  const planNames = new Map<string, string>();
  for (const p of plans) {
    planNames.set(`${p.type}:${p.id}`, p.name);
  }
  return planNames;
}

async function loadSharedData(userId: string) {
  const [allActivityPlans, allHifzPlans, allMurajaPlans, allHifzLogs, allTests] =
    await Promise.all([
      db.query.activityPlans.findMany({
        where: and(
          eq(activityPlans.userId, userId),
          inArray(activityPlans.activityType, ["HIFZ", "MURAJA"]),
        ),
        orderBy: [desc(activityPlans.createdAt)],
      }),
      db.query.hifzPlans.findMany({
        where: eq(hifzPlans.userId, userId),
      }),
      db.query.weeklyMurajaPlans.findMany({
        where: eq(weeklyMurajaPlans.userId, userId),
      }),
      db.query.hifzLogs.findMany({
        where: eq(hifzLogs.userId, userId),
      }),
      db.query.testLogs.findMany({
        where: eq(testLogs.userId, userId),
        orderBy: [desc(testLogs.date)],
      }),
    ]);

  const murajaPlanIds = allMurajaPlans.map((p) => p.id);
  const allMurajaLogs =
    murajaPlanIds.length > 0
      ? await db.query.dailyMurajaLogs.findMany({
          where: inArray(dailyMurajaLogs.planId, murajaPlanIds),
        })
      : [];

  const relevantActivityLogs = await db.query.activityLogs.findMany({
    where: and(
      eq(activityLogs.userId, userId),
      inArray(activityLogs.activityType, ["HIFZ", "MURAJA"]),
    ),
    orderBy: [desc(activityLogs.date), desc(activityLogs.id)],
  });

  return {
    allActivityPlans,
    allHifzPlans,
    allMurajaPlans,
    allHifzLogs,
    allMurajaLogs,
    allTests,
    relevantActivityLogs,
  };
}

function buildJourneyPlans(
  surah: ISurah[],
  allActivityPlans: Awaited<ReturnType<typeof loadSharedData>>["allActivityPlans"],
  allHifzPlans: Awaited<ReturnType<typeof loadSharedData>>["allHifzPlans"],
  allMurajaPlans: Awaited<ReturnType<typeof loadSharedData>>["allMurajaPlans"],
  allHifzLogs: Awaited<ReturnType<typeof loadSharedData>>["allHifzLogs"],
  allMurajaLogs: Awaited<ReturnType<typeof loadSharedData>>["allMurajaLogs"],
): JourneyPlanCard[] {
  const hifzByPlan = new Map(allHifzPlans.map((p) => [p.id, p]));
  const murajaByPlan = new Map(allMurajaPlans.map((p) => [p.id, p]));

  return allActivityPlans
    .map((ap) => {
      if (ap.activityType === "HIFZ" && ap.localRefId) {
        const hp = hifzByPlan.get(ap.localRefId);
        if (!hp) return null;
        const logsForPlan = allHifzLogs.filter((l) => l.hifzPlanId === hp.id);
        const completedPages = logsForPlan.reduce(
          (sum, l) =>
            l.status === "completed" || l.status === "partial"
              ? sum + (l.actualPagesCompleted ?? 0)
              : sum,
          0,
        );
        const startName =
          getSurahNameByNumber(hp.startSurah, surah) ?? `Surah ${hp.startSurah}`;
        const endPage =
          hp.direction === "forward"
            ? hp.startPage + hp.totalPages - 1
            : hp.startPage - hp.totalPages + 1;
        const endName = getSurahByPage(endPage, surah) ?? "End";
        return buildHifzPlanCard(ap, hp, completedPages, surah, startName, endName);
      }

      if (ap.activityType === "MURAJA" && ap.localRefId) {
        const mp = murajaByPlan.get(ap.localRefId);
        if (!mp) return null;
        const logsForPlan = allMurajaLogs.filter((l) => l.planId === mp.id);
        const completedPages = logsForPlan.reduce(
          (sum, l) =>
            l.status === "completed" || l.status === "partial"
              ? sum + (l.completedPages ?? 0)
              : sum,
          0,
        );
        const startName = getSurahByPage(mp.startPage ?? 1, surah) ?? "Start";
        const endName = getSurahByPage(mp.endPage ?? 1, surah) ?? "End";
        return buildMurajaPlanCard(
          ap,
          mp,
          completedPages,
          startName,
          endName,
        );
      }

      return null;
    })
    .filter((p): p is JourneyPlanCard => p !== null);
}

export const journeyService = {
  sessionPageSize: SESSION_PAGE_SIZE,

  async getOverview(userId: string, surah: ISurah[]): Promise<JourneyOverviewResult> {
    const shared = await loadSharedData(userId);
    const planDirections = buildPlanDirections(shared.allHifzPlans);
    const journeyPlans = sortJourneyPlans(
      buildJourneyPlans(
        surah,
        shared.allActivityPlans,
        shared.allHifzPlans,
        shared.allMurajaPlans,
        shared.allHifzLogs,
        shared.allMurajaLogs,
      ),
    );

    const userStat = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });
    const currentStreak = userStat?.murajaCurrentStreak ?? 0;
    const bestStreak = userStat?.globalLongestStreak ?? 0;

    const completionDates = extractCompletionDates(shared.relevantActivityLogs);
    const sessionLogCount = shared.relevantActivityLogs.filter(isRelevantSessionLog).length;

    const hifzPages = shared.allHifzLogs.reduce(
      (sum, l) =>
        l.status === "completed" || l.status === "partial"
          ? sum + (l.actualPagesCompleted ?? 0)
          : sum,
      0,
    );
    const murajaPages = shared.allMurajaLogs.reduce(
      (sum, l) =>
        l.status === "completed" || l.status === "partial"
          ? sum + (l.completedPages ?? 0)
          : sum,
      0,
    );

    const overview = computeOverview({
      activityPlanDates: shared.allActivityPlans
        .map((p) => p.startDate)
        .filter((d): d is string => !!d),
      hifzLogs: shared.allHifzLogs,
      planDirections,
      surah,
      completionDates,
      planCount: journeyPlans.length,
      currentStreak,
      bestStreak,
    });

    const stats = computeJourneyStats({
      hifzPages,
      murajaPages,
      completionDates,
      totalSessions: sessionLogCount,
      currentStreak,
      bestStreak,
    });

    const testStats = computeTestStats(shared.allTests);

    const milestones = computeMilestones({
      hifzLogs: shared.allHifzLogs,
      planDirections,
      surah,
      completionDates,
      sessionCount: sessionLogCount,
      bestStreak: stats.bestStreak,
    });

    return {
      overview,
      stats,
      testStats,
      plans: journeyPlans,
      milestones,
    };
  },

  async getSessionsPage(
    userId: string,
    plans: JourneyPlanCard[],
    offset: number,
  ): Promise<{ sessions: JourneySessionEntry[]; totalSessions: number }> {
    const shared = await loadSharedData(userId);
    const planNames = buildPlanNamesMap(plans);

    const sessionLogs = sortSessionLogs(
      shared.relevantActivityLogs.filter(isRelevantSessionLog),
    );
    const totalSessions = sessionLogs.length;
    const pageLogs = sessionLogs.slice(offset, offset + SESSION_PAGE_SIZE);

    const hifzQuality = new Map<string, number>();
    for (const log of shared.allHifzLogs) {
      if (log.qualityScore != null) {
        hifzQuality.set(`HIFZ:${log.date}`, log.qualityScore);
      }
    }
    const murajaQuality = new Map<string, number>();
    for (const log of shared.allMurajaLogs) {
      if (log.qualityScore != null) {
        murajaQuality.set(`MURAJA:${log.date}`, log.qualityScore);
      }
    }

    const sessions = enrichSessionsWithQuality(
      buildSessionTimeline(pageLogs, planNames),
      hifzQuality,
      murajaQuality,
    );

    return { sessions, totalSessions };
  },
};
