import { TodayTasksSection } from "@/src/components/dashboard/TodayTask";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import {  View } from "react-native";
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
import { useSeedData } from "@/src/hooks/useSeedData";
import { AchievementSection } from "@/src/components/dashboard/AchievementSection";

export default function Dashboard() {
  useSeedData();
  const { items: surah, loading } = useLoadSurahData();
  const { hifz: hifzPlan, isLoading: loadingHifz } = useHifzPlan();
  const habitProgress = useHabitProgress();
  const { analytics } = habitProgress;
  const { weeklyPlan: murajaPlan, loading: loadingMuraja } = useWeeklyMuraja();
  const { data: badges = [] } = useUserBadges();

  const { data: userStats } = useUserStats();

  const hifzAnalytics = useMemo(() => {
    if (!hifzPlan || !surah.length) return null;
    return hifzStatus(hifzPlan, surah);
  }, [hifzPlan, surah]);

 

 
  if (loadingHifz || loadingMuraja || loading) return <DashboardSkeleton />;

  if (!hifzPlan && !murajaPlan) {
    return <Redirect href="/(app)/onboarding" />;
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
              murajaPlan={murajaPlan}
              surah={surah}
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
                goalPages={habitProgress.todayStats.goalPages}
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
