import { InfiniteData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import {
  journeyService,
  SESSION_PAGE_SIZE,
} from "../services/journeyService";
import type {
  JourneyData,
  JourneySessionEntry,
} from "../types";
import type { JourneyOverviewResult } from "../services/journeyService";

const PLAN_PAGE_SIZE = 4;

type JourneySessionsPage = {
  sessions: JourneySessionEntry[];
  totalSessions: number;
};

export function useJourney() {
  const { user } = useSession();
  const { items: surah, loading: surahLoading } = useLoadSurahData();
  const userId = user?.id;

  const [visiblePlanCount, setVisiblePlanCount] = useState(PLAN_PAGE_SIZE);

  const overviewQuery = useQuery<JourneyOverviewResult, Error>({
    queryKey: ["journey-overview", userId, surah.length],
    queryFn: async () => journeyService.getOverview(userId!, surah),
    enabled: !!userId && surah.length > 0,
    staleTime: 0,
  });

  const sessionsQuery = useInfiniteQuery<
    JourneySessionsPage,
    Error,
    InfiniteData<JourneySessionsPage>,
    readonly (string | number | undefined)[],
    number
  >({
    queryKey: [
      "journey-sessions",
      userId,
      surah.length,
      overviewQuery.data?.plans.length,
    ],
    queryFn: async ({ pageParam = 0 }) =>
      journeyService.getSessionsPage(userId!, overviewQuery.data!.plans, pageParam),
    enabled: !!userId && surah.length > 0 && !!overviewQuery.data,
    staleTime: 0,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loadedCount = pages.reduce(
        (sum, page) => sum + page.sessions.length,
        0,
      );
      return loadedCount < lastPage.totalSessions ? loadedCount : undefined;
    },
  });

  const sessions = useMemo(() => {
    return sessionsQuery.data?.pages.flatMap((page) => page.sessions) ?? [];
  }, [sessionsQuery.data?.pages]);

  const totalSessions = sessionsQuery.data?.pages?.[0]?.totalSessions ?? 0;

  const data: JourneyData | null = useMemo(() => {
    if (!overviewQuery.data) return null;
    return {
      ...overviewQuery.data,
      plans: overviewQuery.data.plans.slice(0, visiblePlanCount),
      sessions,
      totalSessions,
    };
  }, [overviewQuery.data, visiblePlanCount, sessions, totalSessions]);

  const totalPlans = overviewQuery.data?.plans.length ?? 0;
  const hasMorePlans = totalPlans > visiblePlanCount;
  const hasMoreSessions = sessionsQuery.hasNextPage ?? false;

  const loadMoreSessions = sessionsQuery.fetchNextPage;

  const refetchOverview = overviewQuery.refetch;
  const refetchSessions = sessionsQuery.refetch;

  const refetch = useCallback(async () => {
    await Promise.all([refetchOverview(), refetchSessions()]);
  }, [refetchOverview, refetchSessions]);

  const loadMorePlans = useCallback(() => {
    setVisiblePlanCount((c) => c + PLAN_PAGE_SIZE);
  }, []);

  return {
    data,
    loading: overviewQuery.isLoading || surahLoading,
    sessionsLoading: sessionsQuery.isFetchingNextPage,
    error: overviewQuery.isError || sessionsQuery.isError,
    refetch,
    loadMorePlans,
    hasMorePlans,
    loadMoreSessions,
    hasMoreSessions,
    totalPlans,
  };
}
