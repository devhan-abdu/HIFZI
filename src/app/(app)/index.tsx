import { TodayTasksSection } from "@/src/components/dashboard/TodayTask";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useGetHifzPlan } from "@/src/features/hifz/hook/useGetHifzPlan";
import Card from "@/src/components/dashboard/Card";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DashboardSkeleton } from "@/src/components/dashboard/Skeleton";
import { Header } from "@/src/components/navigation/Header";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useEffect, useMemo } from "react";
import { Text } from "@/src/components/common/ui/Text";
import { useSession } from "@/src/hooks/useSession";
import { HabitProgressRing } from "@/src/features/habit/components/HabitProgressRing";
import { HabitHeatmapCard } from "@/src/features/habit/components/HabitHeatmapCard";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useSQLiteContext } from "expo-sqlite";
import {
  markWeeklySummarySeen,
  shouldShowWeeklySummary,
} from "@/src/features/habits/services/habitProgressService";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SuggestionsSheet } from "@/src/features/habit/components/SuggestionsSheet";
import { useAdaptiveGuidance } from "@/src/features/habit/hooks/useAdaptiveGuidance";

export default function Dashboard() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { user } = useSession();
  const { items: surah, loading } = useLoadSurahData();
  const { hifz: hifzPlan, isLoading: loadingHifz } = useGetHifzPlan();
  const habitProgress = useHabitProgress();
  const { analytics } = habitProgress;
  const { weeklyPlan: murajaPlan, loading: loadingMuraja } = useWeeklyMuraja();
  const habitUserId = user?.id ?? "local-user";
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const guidanceQuery = useAdaptiveGuidance(habitProgress.activityHash);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const openSummary = await shouldShowWeeklySummary(db, habitUserId);
      if (!mounted || !openSummary) return;
      await markWeeklySummarySeen(db, habitUserId);
      router.push("/(app)/weekly-summary" as never);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [db, habitUserId, router]);

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
          <Card
            hifzAnalytics={hifzAnalytics ?? null}
            habitProgress={habitProgress}
            murajaPlan={murajaPlan}
            surah={surah}
          />
          <View className="mt-5">
            <HabitProgressRing
              currentMinutes={habitProgress.heatmap.slice(-1)[0]?.minutes ?? 0}
              streak={analytics.currentStreak}
            />
            <HabitHeatmapCard points={habitProgress.heatmap} />
            <View className="mt-6 rounded-2xl bg-white border border-slate-200 p-4">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Guidance
              </Text>
              <Text className="text-sm text-slate-600 mb-4">
                Get tailored recommendations based on your real Hifz and Muraja logs.
              </Text>
              <Pressable
                onPress={() => setSuggestionsOpen(true)}
                className="h-12 bg-primary rounded-xl items-center justify-center flex-row"
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text className="text-white ml-2">Get Suggestions</Text>
              </Pressable>
            </View>
          </View>
          <View className="mt-10 px-1">
            <Text className="text-gray-400   uppercase tracking-[2px] text-[10px] mb-2">
              Insights
            </Text>
            <Text className="text-2xl  text-slate-900 mb-6">
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

          <View className="mt-6  px-1">
            <Text className="text-gray-400   uppercase tracking-[2px] text-[10px] mb-2">
              Focus
            </Text>

            <Text className="text-xl  text-gray-900 mb-5">
              Today&apos;s Task
            </Text>

            <TodayTasksSection />
          </View>
        </ScreenContent>
      </Screen>
      <SuggestionsSheet
        visible={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        loading={guidanceQuery.isLoading}
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
