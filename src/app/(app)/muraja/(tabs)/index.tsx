import React from "react";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { router } from "expo-router";

import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { SectionHeader } from "@/src/components/SectionHeader";

import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useWeeklyReview } from "@/src/features/muraja/hooks/useWeeklyReview";
import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";

import { WeeklyOverviewCard } from "@/src/features/muraja/components/WeeklyOverviewCard";
import { WeeklyMurajaSkeleton } from "@/src/features/muraja/components/skeletons";
import MurajaEmptyState from "@/src/features/muraja/components/MurajaEmptyState";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DayByDay } from "@/src/features/muraja/components/DayByDay";
import { ActionTaskCard } from "@/src/components/common/ActionCard";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";
import { Ionicons } from "@expo/vector-icons";

export default function MurajaIndex() {
  const {
    weeklyPlan,
    stats,
    todayTask,
    weekProgress,
    loading,
    error,
    refetch,
  } = useWeeklyMuraja();
  const session = useReaderSessionStore();

  const {
    analytics,
    plan: reviewPlan,
    isLoading: loadingReview,
  } = useWeeklyReview();
  const { updateLog, isUpdating } = useMurajaOperation();

  const handleUpdate = async (status: "completed" | "pending") => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompleted = status === "completed" ? true : false;

    if (!weeklyPlan || !todayTask) return;
    try {
      await updateLog({
        plan_id: weeklyPlan?.id,
        date: todayStr,
        start_page: todayTask.startPage,
        end_page: isCompleted ? todayTask.endPage : todayTask.startPage,
        completed_pages: isCompleted ? (weeklyPlan.planned_pages_per_day || 0) : 0,
        actual_time_min: weeklyPlan.estimated_time_min || 0,
        status: status,
        is_catchup: todayTask.isCatchup ? 1 : 0,
        sync_status: 0,
        remote_id: null,
        mistakes_count: 0,
        hesitation_count: 0
      });
    } catch (err: any) {
      console.log("Undo/Redo failed", err);
    }
  };

  if (loading || loadingReview)
    return (
      <Screen>
        <WeeklyMurajaSkeleton />
      </Screen>
    );

  if (error) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-slate-500 mb-4">Failed to load plans</Text>
          <Button onPress={() => refetch()}>Try Again</Button>
        </View>
      </Screen>
    );
  }

  const title =
    todayTask?.startSurah === todayTask?.endSurah ?
      todayTask?.startSurah
    : `${todayTask?.startSurah} – ${todayTask?.endSurah}`;

  if (weeklyPlan) {
    return (
      <Screen>
        <ScreenContent>
          <View className="mb-12">
            <WeeklyOverviewCard weeklyPlan={weeklyPlan} />

            <View className="mt-6 mb-4">
              <SectionHeader title="Today's Muraja'a" />
              {todayTask ?
                <ActionTaskCard
                  typeLabel="Muraja'a"
                  title={title ?? ''}
                  subTitle={`Pages ${todayTask.startPage} – ${todayTask.endPage}`}
                  status={todayTask.status} 
                  isCatchup={todayTask.isCatchup}
                  isLoading={isUpdating}
                  onDone={() => handleUpdate(
                    (
                      todayTask.status === "completed" ||
                      todayTask.status === "partial"
                    ) ?
                      "pending"
                      : "completed"
                  )}
                  onStart={() => {
                    session.openSession(todayTask.startPage);
                    router.push(`/(app)/quran/reader?page=${todayTask.startPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayTask.startPage}&end=${todayTask.endPage}`);
                  }}
                  onResume={() => {
                    router.push(`/(app)/quran/reader?page=${session.currentPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayTask.startPage}&end=${todayTask.endPage}`);
                  }}
                  isResumable={session.currentPage >= todayTask.startPage && session.currentPage <= todayTask.endPage}
                  onDetails={() => router.push("/(app)/muraja/log")}
                />
              : <View className="bg-white border border-slate-100 rounded-[32px] p-8 items-center shadow-sm">
                  <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mb-4">
                    <Ionicons name="cafe-outline" size={24} color="#0891b2" />
                  </View>
                  <Text className="text-slate-900 text-base text-center mb-1">Rest Day for Muraja'a</Text>
                  <Text className="text-slate-500 text-xs text-center mb-6 px-4">
                    No Muraja tasks today. Feel free to rest or log some extra revision pages.
                  </Text>
                  <Button 
                    variant="outline" 
                    className="w-full border-slate-100 bg-slate-50"
                    onPress={() => router.push("/(app)/muraja/log")}
                  >
                    <Text className="text-xs uppercase tracking-widest text-primary ">Log Extra Muraja</Text>
                  </Button>
                </View>
              }
            </View>

            <View className="mt-6">
              <Text className="text-gray-400  uppercase tracking-[2px] text-[10px] mb-1 px-1">
                Insights
              </Text>
              <Text className="text-xl  text-gray-900 mb-4 px-1">
                Muraja Analytics
              </Text>

              <View className="flex-row flex-wrap justify-between">
                <StatCard
                  title="Completed"
                  value={stats?.totalCompletedPages ?? ""}
                  unit="Pages"
                  icon="checkmark-done-circle-outline"
                />
                <StatCard
                  title="Total Progress"
                  value={Number(stats?.overAllProgress)}
                  unit="%"
                  icon="trending-up-outline"
                />
              </View>
            </View>
            <View className="mt-6 mb-1 px-1">
              <Text className="text-gray-400   uppercase tracking-[2px] text-[10px] mb-2">
                Activity
              </Text>

              <Text className="text-xl  text-gray-900 mb-5">
                Weekly Consistency
              </Text>

              <DayByDay progress={weekProgress ?? null} />
            </View>
          </View>
        </ScreenContent>

        <ScreenFooter>
          <View className="flex-row gap-x-3">
            <Button
              className="flex-1 shadow-lg shadow-primary/20"
              onPress={() => router.push(`/(app)/log-center?type=muraja`)}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="text-white">
                 Log Progress
              </Text>
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.push("/(app)/muraja/create-muraja-plan")}
            >
              <Ionicons name="pencil-outline" size={18} color="#276359" />
              <Text className="text-primary">
               Edit Plan
              </Text>
            </Button>
          </View>
        </ScreenFooter>
      </Screen>
    );
  }

  // if (analytics && reviewPlan) {
  //   return <MurajaReviewPage plan={reviewPlan} analytics={analytics} />;
  // }

  return (
    <Screen>
      <MurajaEmptyState />
    </Screen>
  );
}
