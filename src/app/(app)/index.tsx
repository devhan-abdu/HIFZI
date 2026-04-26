import { TodayTasksSection } from "@/src/components/dashboard/TodayTask";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import Card from "@/src/components/dashboard/Card";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DashboardSkeleton } from "@/src/components/dashboard/Skeleton";
import { Header } from "@/src/components/navigation/Header";
import { NextBestAction } from "@/src/components/dashboard/NextBestAction";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useMemo } from "react";
import { Text } from "@/src/components/common/ui/Text";
import { useSession } from "@/src/hooks/useSession";
import { HabitProgressRing } from "@/src/features/habit/components/HabitProgressRing";
import { HeatmapOfHeart } from "@/src/features/quran/components/HeatmapOfHeart";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SuggestionsSheet } from "@/src/features/habit/components/SuggestionsSheet";
import { useAdaptiveGuidance } from "@/src/features/habit/hooks/useAdaptiveGuidance";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";

import { useUserStats } from "@/src/hooks/useUserStats";

export default function Dashboard() {
  const { user } = useSession();
  const { items: surah, loading } = useLoadSurahData();
  const { hifz: hifzPlan, isLoading: loadingHifz } = useHifzPlan();
  const habitProgress = useHabitProgress();
  const { analytics } = habitProgress;
  const { weeklyPlan: murajaPlan, loading: loadingMuraja } = useWeeklyMuraja();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const guidanceQuery = useAdaptiveGuidance(habitProgress.activityHash);

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
      <Header title="Home" />
      <Screen>
        <ScreenContent>
          <NextBestAction />
          <View className="mt-8" />

          <View className="mb-8">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Focus
            </Text>
            <Text className="text-xl text-gray-900 mb-4 px-1">
              Today&apos;s Checklist
            </Text>
            <TodayTasksSection />
          </View>

          <View className="mb-8">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Overview
            </Text>
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
              Consistency
            </Text>
            <View className="bg-slate-50 border border-slate-100 rounded-3xl p-5 mb-4 items-center">
              <HabitProgressRing
                currentMinutes={habitProgress.heatmap.slice(-1)[0]?.minutes ?? 0}
                streak={analytics.currentStreak}
              />
            </View>
            <HeatmapOfHeart />
          </View>

          <View className="mb-8 rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-indigo-900 font-bold mb-1">Adaptive Guidance</Text>
              <Text className="text-xs text-indigo-700">
                Tailored tips based on your recent progress.
              </Text>
            </View>
            <Pressable
              onPress={() => setSuggestionsOpen(true)}
              className="bg-indigo-600 rounded-full w-10 h-10 items-center justify-center shadow-sm"
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
            </Pressable>
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
        </ScreenContent>
      </Screen>

      <SuggestionsSheet
        visible={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        loading={guidanceQuery.isLoading}
        isStale={guidanceQuery.data?.isStale}
        suggestion={guidanceQuery.data?.suggestion ?? null}
        explanation={
          guidanceQuery.data?.explanation ??
          "Keep following your current plan and prioritize consistency."
        }
        completionRate={analytics.completionRate}
        streak={analytics.currentStreak}
        revisionFrequency={analytics.revisionFrequency}
      />
    </>
  );
}
