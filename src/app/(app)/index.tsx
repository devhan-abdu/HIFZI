import { TodayTasksSection } from "@/src/components/dashboard/TodayTask";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { View } from "react-native";
import { useAppActiveRefresh } from "@/src/hooks/useAppActiveRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useNavigate } from "@/src/hooks/useNavigate";
import Card from "@/src/components/dashboard/Card";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DashboardSkeleton } from "@/src/components/dashboard/Skeleton";
import { Header } from "@/src/components/navigation/Header";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { Text } from "@/src/components/common/ui/Text";
import { HabitProgressRing } from "@/src/features/habits/components/HabitProgressRing";
import { HeatmapOfHeart } from "@/src/features/quran/components/HeatmapOfHeart";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import { useHifzCardState } from "@/src/features/hifz/hooks/useHifzCardState";
import { useUserStats } from "@/src/hooks/useUserStats";
import { useUserBadges } from "@/src/hooks/useUserBadges";
import { AchievementSection } from "@/src/components/dashboard/AchievementSection";
import { useSyncStore } from "@/src/services/sync/syncStore";
import { useMurajaAnalytics } from "@/src/features/muraja/hooks/useMurajaAnalytics";
import { useMurajaCardState } from "@/src/features/muraja/hooks/useMurajaCardState";
import { useMemo, useRef, useCallback } from "react";
import { useSession } from "@/src/hooks/useSession";

export default function Dashboard() {
  const { push } = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { items: surah } = useLoadSurahData();

  const { hifz: hifzPlan, isLoading: loadingHifz } = useHifzPlan();
  const habitProgress = useHabitProgress();
  const { analytics } = habitProgress;
  const { data: badges = [] } = useUserBadges();
  const { data: userStats } = useUserStats();
  const hasSyncedOnce = useSyncStore((s) => s.hasSyncedOnce);

  const hifzCardState = useHifzCardState();
  const murajaCardState = useMurajaCardState();

  const {
    weeklyPlan: murajaPlan,
    stats: murajaStats,
    loading: loadingMuraja,
  } = useMurajaAnalytics() ?? {};

  useAppActiveRefresh(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["muraja-dashboard", user?.id],
      });
    }, [queryClient, user?.id]),
  );

  const surahReady = surah.length > 0;

  const hifzAnalytics = useMemo(() => {
    if (!hifzPlan || !surahReady) return null;
    const status = hifzStatus(hifzPlan, surah);
    if (!status) return null;
    const stripSurah = (name?: string) =>
      name?.replace(/^Surat\s+/i, "").trim() ?? "";
    return {
      ...status,
      daysPerWeek: hifzPlan.selectedDays?.length ?? 0,
      planRangeLabel: [
        stripSurah(status.startSurah),
        stripSurah(status.endSurah),
      ]
        .filter(Boolean)
        .join(" – "),
    };
  }, [hifzPlan, surah, surahReady]);

  const murajaHero = useMemo(() => {
    if (!murajaPlan) return null;
    const stripSurah = (name?: string) =>
      name?.replace(/^Surat\s+/i, "").trim() ?? "";
    return {
      id: murajaPlan.id,
      planned_pages_per_day: murajaPlan.planned_pages_per_day,
      targetEndDate: murajaPlan.week_end_date ?? murajaPlan.endDate ?? null,
      totalDays: murajaPlan.totalDays ?? murajaPlan.plannedDays,
      currentSurah: murajaStats?.currentSurah,
      pageInSurah: murajaStats?.pageInSurah,
      startSurah: murajaPlan.startSurah,
      planRangeLabel: [
        stripSurah(murajaPlan.startSurah),
        stripSurah(murajaPlan.endSurah),
      ]
        .filter(Boolean)
        .join(" – "),
      overAllProgress: murajaStats?.overAllProgress,
    };
  }, [murajaPlan, murajaStats]);

  const lastHifzAnalytics = useRef(hifzAnalytics);
  if (hifzAnalytics) lastHifzAnalytics.current = hifzAnalytics;
  const lastMurajaHero = useRef(murajaHero);
  if (murajaHero) lastMurajaHero.current = murajaHero;

  const dynamicGoalPages = useMemo(() => {
    let goal = 0;

    const murajaTask =
      (
        murajaCardState.type === "PLANNED_DAY" ||
        murajaCardState.type === "CATCHUP_DAY" ||
        murajaCardState.type === "COMPLETED_TODAY"
      ) ?
        murajaCardState.task
      : null;

    const hifzTask =
      (
        hifzCardState.type === "PLANNED_DAY" ||
        hifzCardState.type === "CATCHUP_DAY" ||
        hifzCardState.type === "COMPLETED_TODAY"
      ) ?
        hifzCardState.task
      : null;

    if (murajaTask) {
      goal += Math.max(
        0,
        (murajaTask.quotaEnd ?? murajaTask.endPage) - murajaTask.startPage + 1,
      );
    }
    if (hifzTask) {
      goal += hifzTask.totalTarget ?? 0;
    }
    if (goal === 0) return Math.max(1, habitProgress.todayStats.completedPages);
    return goal;
  }, [murajaCardState, hifzCardState, habitProgress.todayStats.completedPages]);

  const isFirstLoad =
    (loadingHifz && !hifzPlan) || (loadingMuraja && !murajaPlan);

  if (isFirstLoad) return <DashboardSkeleton />;

  if (hasSyncedOnce && !hifzPlan && !murajaPlan) {
    return <Redirect href="/onboarding" />;
  }

  if (!hifzPlan && !murajaPlan) return <DashboardSkeleton />;

  return (
    <>
      <Header title="Home" userStats={userStats} />
      <Screen>
        <ScreenContent>
          <View className="mb-8">
            <Card
              hifzAnalytics={hifzAnalytics ?? lastHifzAnalytics.current}
              murajaHero={murajaHero ?? lastMurajaHero.current}
              habitProgress={habitProgress}
              userStats={userStats ?? null}
            />
          </View>

          <View className="mb-8">
            <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Focus
            </Text>
            <View className="flex-row justify-between items-end mb-4 px-1">
              <Text className="text-xl text-text">Today's Checklist</Text>
            </View>
            <TodayTasksSection
              onLogHifz={() => push("/(app)/hifz/log")}
              onLogMuraja={() => push("/(app)/muraja/log")}
            />
          </View>

          <View className="mb-8">
            <View className="flex-row justify-between items-end mb-4 px-1">
              <Text className="text-text  text-xl mb-2 px-1">Consistency</Text>
            </View>
            <View className="bg-surface-muted border border-border rounded-3xl p-5 mb-4 items-center">
              <HabitProgressRing
                completedPages={habitProgress.todayStats.completedPages}
                goalPages={dynamicGoalPages}
                streak={analytics.currentStreak}
              />
            </View>
            <HeatmapOfHeart />
          </View>

          <View className="mb-10 px-1">
            <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2">
              Insights
            </Text>
            <Text className="text-2xl text-text mb-6">Plan Analytics</Text>
            <View className="flex-row flex-wrap justify-between">
              <StatCard
                category="Hifz"
                title="Remaining"
                value={hifzAnalytics?.remainingPages ?? 0}
                unit="Pages"
                icon="book-outline"
                type="hifz"
              />
              <StatCard
                category="Hifz"
                title="Days Left"
                value={hifzAnalytics?.daysNeeded ?? 0}
                unit="Days"
                icon="calendar-outline"
                type="hifz"
              />
              <StatCard
                category="All"
                title="Streak"
                value={analytics?.currentStreak ?? 0}
                unit="Days"
                icon="flame-outline"
                type="muraja"
              />
              <StatCard
                category="All"
                title="Completion"
                value={analytics?.completionRate ?? 0}
                unit="%"
                icon="checkmark-circle-outline"
                type="muraja"
              />
            </View>
          </View>

          <AchievementSection badges={badges} />
        </ScreenContent>
      </Screen>
    </>
  );
}
