import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import {
  journeyService,
  SESSION_PAGE_SIZE,
} from "../services/journeyService";
import type { JourneyData, JourneySessionEntry } from "../types";

const PLAN_PAGE_SIZE = 4;

export function useJourney() {
  const { user } = useSession();
  const { items: surah, loading: surahLoading } = useLoadSurahData();
  const userId = user?.id;

  const [visiblePlanCount, setVisiblePlanCount] = useState(PLAN_PAGE_SIZE);
  const [sessionOffset, setSessionOffset] = useState(0);
  const [loadedSessions, setLoadedSessions] = useState<JourneySessionEntry[]>([]);

  const overviewQuery = useQuery({
    queryKey: ["journey-overview", userId, surah.length],
    queryFn: async () => {
      if (!userId || surah.length === 0) return null;
      return journeyService.getOverview(userId, surah);
    },
    enabled: !!userId && surah.length > 0,
    // Always read from local SQLite — staleTime:0 ensures plan
    // changes (pause/resume/edit) are reflected on next focus/refetch
    staleTime: 0,
  });

  const sessionsQuery = useQuery({
    queryKey: [
      "journey-sessions",
      userId,
      surah.length,
      sessionOffset,
      overviewQuery.data?.plans.length,
    ],
    queryFn: async () => {
      if (!userId || surah.length === 0 || !overviewQuery.data) return null;
      return journeyService.getSessionsPage(
        userId,
        overviewQuery.data.plans,
        sessionOffset,
      );
    },
    enabled: !!userId && surah.length > 0 && !!overviewQuery.data,
    staleTime: 0,
  });

  const totalSessions = sessionsQuery.data?.totalSessions ?? 0;

  useEffect(() => {
    if (!sessionsQuery.data) {
      if (sessionOffset === 0) setLoadedSessions([]);
      return;
    }
    if (sessionOffset === 0) {
      setLoadedSessions(sessionsQuery.data.sessions);
    } else {
      setLoadedSessions((prev) => {
        const existing = new Set(prev.map((s) => s.id));
        const next = sessionsQuery.data!.sessions.filter((s) => !existing.has(s.id));
        return [...prev, ...next];
      });
    }
  }, [sessionsQuery.data, sessionOffset]);

  const data: JourneyData | null = useMemo(() => {
    if (!overviewQuery.data) return null;
    return {
      ...overviewQuery.data,
      plans: overviewQuery.data.plans.slice(0, visiblePlanCount),
      sessions: loadedSessions,
      totalSessions,
    };
  }, [overviewQuery.data, visiblePlanCount, loadedSessions, totalSessions]);

  const totalPlans = overviewQuery.data?.plans.length ?? 0;
  const hasMorePlans = totalPlans > visiblePlanCount;
  const hasMoreSessions = loadedSessions.length < totalSessions;

  const loadMoreSessions = () => {
    setSessionOffset((o) => o + SESSION_PAGE_SIZE);
  };

  return {
    data,
    loading: overviewQuery.isLoading || surahLoading,
    sessionsLoading: sessionsQuery.isLoading && sessionOffset > 0,
    error: overviewQuery.isError || sessionsQuery.isError,
    refetch: () => {
      setSessionOffset(0);
      setLoadedSessions([]);
      overviewQuery.refetch();
      sessionsQuery.refetch();
    },
    loadMorePlans: () => setVisiblePlanCount((c) => c + PLAN_PAGE_SIZE),
    hasMorePlans,
    loadMoreSessions,
    hasMoreSessions,
    totalPlans,
  };
}
