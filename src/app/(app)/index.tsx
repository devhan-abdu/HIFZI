import { TodayTasksSection } from "@/src/components/dashboard/TodayTask";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import Card from "@/src/components/dashboard/Card";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DashboardSkeleton } from "@/src/components/dashboard/Skeleton";
import { Header } from "@/src/components/navigation/Header";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useMemo } from "react";
import { Text } from "@/src/components/common/ui/Text";
import { useSession } from "@/src/hooks/useSession";
import { HabitProgressRing } from "@/src/features/habits/components/HabitProgressRing";
import { HeatmapOfHeart } from "@/src/features/quran/components/HeatmapOfHeart";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { runHifzSeedingScenario } from "@/src/features/hifz/utils/seed-hifz-logic";
import { db } from "@/src/lib/db/local-client";
import { activityPlans } from "@/src/features/habits/database/habitSchema";
import { hifzPlans } from "@/src/features/hifz/database/hifzSchema";
import { weeklyMurajaPlans } from "@/src/features/muraja/database/murajaSchema";
import { eq } from "drizzle-orm";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWeeklyEvaluationTrigger } from "@/src/features/habits/hooks/useWeeklyEvaluationTrigger";

import { useUserStats } from "@/src/hooks/useUserStats";
import { useUserBadges } from "@/src/hooks/useUserBadges";
import { AchievementSection } from "@/src/components/dashboard/AchievementSection";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";

export default function Dashboard() {
  const { user } = useSession();
  const { duePlans, duePlanIds } = useWeeklyEvaluationTrigger();
  const queryClient = useQueryClient();
  const session = useReaderSessionStore();
  const { items: surah, loading } = useLoadSurahData();
  const { hifz: hifzPlan, isLoading: loadingHifz } = useHifzPlan();
  const habitProgress = useHabitProgress();
  const { analytics } = habitProgress;
  const { weeklyPlan: murajaPlan, loading: loadingMuraja } = useWeeklyMuraja();
  const { data: badges = [] } = useUserBadges();

  const { data: userStats } = useUserStats();

  const onStartHifz = (task: any, planId: number) => {
    session.openSession(task.startPage);
    router.push(`/(app)/quran/reader?page=${task.startPage}&planId=${planId}&type=hifz&start=${task.startPage}&end=${task.endPage}`);
  };

  const onResumeHifz = (task: any, planId: number) => {
    router.push(`/(app)/quran/reader?page=${session.currentPage}&planId=${planId}&type=hifz&start=${task.startPage}&end=${task.endPage}`);
  };

  const onStartMuraja = (task: any, planId: number) => {
    session.openSession(task.startPage);
    router.push(`/(app)/quran/reader?page=${task.startPage}&planId=${planId}&type=muraja&start=${task.startPage}&end=${task.endPage}`);
  };

  const onResumeMuraja = (task: any, planId: number) => {
    router.push(`/(app)/quran/reader?page=${session.currentPage}&planId=${planId}&type=muraja&start=${task.startPage}&end=${task.endPage}`);
  };

  const hifzAnalytics = useMemo(() => {
    if (!hifzPlan || !surah.length) return null;
    return hifzStatus(hifzPlan, surah);
  }, [hifzPlan, surah]);

  useEffect(() => {
    if (__DEV__ && user?.id && surah.length > 0) {
      const initSeeding = async () => {
        const hasSeeded = await AsyncStorage.getItem("SEED_V_STRONG_BOTH_V6");
        if (!hasSeeded) {
          // 1. Clear existing data and set common evaluation day
          await db.update(activityPlans).set({ evaluationDay: 6 }).where(eq(activityPlans.userId, user.id));
          await db.update(hifzPlans).set({ evaluationDay: 6 }).where(eq(hifzPlans.userId, user.id));
          await db.update(weeklyMurajaPlans).set({ evaluationDay: 6 }).where(eq(weeklyMurajaPlans.userId, user.id));

          // 2. Run the Strong Both scenario
          await runHifzSeedingScenario(user.id, surah, "strong_hifz_good_muraja");
          await AsyncStorage.setItem("SEED_V_STRONG_BOTH_V6", "true");
          queryClient.invalidateQueries();
        }
      };
      initSeeding();
    }
  }, [user?.id, surah.length]);

 

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
              {__DEV__ && (
                <Pressable
                  onPress={async () => {
                    await AsyncStorage.removeItem("SEED_V_ADAPTIVE_TEST");
                    router.replace("/(app)");
                  }}
                  className="bg-slate-100 px-3 py-1 rounded-full"
                >
                  <Text className="text-[10px] text-slate-500 font-bold">RE-SEED TEST DATA</Text>
                </Pressable>
              )}
            </View>
            <TodayTasksSection 
              onLogHifz={() => router.push("/(app)/hifz/log")}
              onLogMuraja={() => router.push("/(app)/muraja/log")}
              onStartHifz={onStartHifz}
              onResumeHifz={onResumeHifz}
              onStartMuraja={onStartMuraja}
              onResumeMuraja={onResumeMuraja}
              duePlans={duePlans}
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
