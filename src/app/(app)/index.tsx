import { TodayTasksSection } from "@/src/components/dashboard/TodayTask";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import Card from "@/src/components/dashboard/Card";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DashboardSkeleton } from "@/src/components/dashboard/Skeleton";
import { Header } from "@/src/components/navigation/Header";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useMemo } from "react";
import { Text } from "@/src/components/common/ui/Text";
import { HabitProgressRing } from "@/src/features/habits/components/HabitProgressRing";
import { HeatmapOfHeart } from "@/src/features/quran/components/HeatmapOfHeart";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import { useUserStats } from "@/src/hooks/useUserStats";
import { useUserBadges } from "@/src/hooks/useUserBadges";
import { AchievementSection } from "@/src/components/dashboard/AchievementSection";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { useSyncStore } from "@/src/services/sync/syncStore";

export default function Dashboard() {
  const { items: surah } = useLoadSurahData();
  const { hifz: hifzPlan, isLoading: loadingHifz } = useHifzPlan();
  const habitProgress = useHabitProgress();
  const { analytics } = habitProgress;
  const {
    weeklyPlan: murajaPlan,
    stats: murajaStats,
    loading: loadingMuraja,
    todayTask: murajaTodayTask,
  } = useWeeklyMuraja();
  const { todayTask: hifzTodayTask } = useHifzDailyTask();
  const { data: badges = [] } = useUserBadges();
  const { data: userStats } = useUserStats();

  // Only true after the first remote pull has completed — prevents premature onboarding redirect
  const hasSyncedOnce = useSyncStore((s) => s.hasSyncedOnce);

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
      planRangeLabel: [stripSurah(status.startSurah), stripSurah(status.endSurah)]
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
      planRangeLabel: [stripSurah(murajaPlan.startSurah), stripSurah(murajaPlan.endSurah)]
        .filter(Boolean)
        .join(" – "),
      overAllProgress: murajaStats?.overAllProgress,
    };
  }, [murajaPlan, murajaStats]);

  const dynamicGoalPages = useMemo(() => {
    let goal = 0;

    // Muraja: count this plan's pages only if a task is actually due today (scheduled or catch-up)
    if (murajaPlan && murajaTodayTask) {
      const start = murajaTodayTask.startPage;
      const end = murajaTodayTask.quotaEnd ?? murajaTodayTask.endPage;
      goal += Math.max(0, end - start + 1);
    }

    // Hifz: count this plan's pages only if a task is actually due today
    if (hifzPlan && hifzTodayTask) {
      goal += hifzTodayTask.totalTarget ?? 0;
    }

    // True global rest day — show ring as "full" relative to whatever was done
    // so it doesn't demand 24 pages when nothing was planned
    if (goal === 0) {
      const completed = habitProgress.todayStats.completedPages;
      return Math.max(1, completed);
    }

    return goal;
  }, [murajaPlan, murajaTodayTask, hifzPlan, hifzTodayTask, habitProgress.todayStats.completedPages]);

  // Only block on plans — surah data loads independently and each section handles its own state
  const isLoading = loadingHifz || loadingMuraja;
  if (isLoading) return <DashboardSkeleton />;

  // Only redirect if sync has completed AND still no plans — prevents new-device false redirect
  if (hasSyncedOnce && !hifzPlan && !murajaPlan) {
    return <Redirect href="/onboarding" />;
  }

  // Still waiting for first sync on a new device — show skeleton, not onboarding
  if (!hifzPlan && !murajaPlan) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <Header title="Home" userStats={userStats} />
      <Screen>
        <ScreenContent>
          <View className="mb-8">
            <Card
              hifzAnalytics={hifzAnalytics ?? null}
              habitProgress={habitProgress}
              murajaHero={murajaHero}
              userStats={userStats ?? null}
            />
          </View>

          <View className="mb-8">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Focus
            </Text>
            <View className="flex-row justify-between items-end mb-4 px-1">
              <Text className="text-xl text-gray-900">
                Today&apos;s Checklist
              </Text>
            </View>
            <TodayTasksSection
              onLogHifz={() => router.push("/(app)/hifz/log")}
              onLogMuraja={() => router.push("/(app)/muraja/log")}
            />
          </View>

          <View className="mb-8">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Consistency
            </Text>
            <View className="bg-slate-50 border border-slate-100 rounded-3xl p-5 mb-4 items-center">
              <HabitProgressRing
                completedPages={habitProgress.todayStats.completedPages}
                goalPages={dynamicGoalPages}
                streak={analytics.currentStreak}
              />
            </View>
            <HeatmapOfHeart />
          </View>

          <View className="mb-10 px-1">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
              Insights
            </Text>
            <Text className="text-2xl text-slate-900 mb-6">
              Plan Analytics
            </Text>

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
