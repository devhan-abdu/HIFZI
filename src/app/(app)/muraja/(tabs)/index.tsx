import React from "react";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { useRouter } from "expo-router";

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

export default function MurajaIndex() {
  const router = useRouter();
  const {
    weeklyPlan,
    stats,
    todayTask,
    weekProgress,
    loading,
    error,
    refetch,
  } = useWeeklyMuraja();

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
        completed_pages: isCompleted ? weeklyPlan.planned_pages_per_day : 0,
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
                  title={`${todayTask.startSurah ?? ""} – ${todayTask.endSurah ?? ""}`}
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
                  logRoute="/muraja/log" onMissed={function (): void {
                    throw new Error("Function not implemented.");
                  } }                />
              : <View className="p-8 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                  <Text className="text-center text-slate-400 ">
                    No session scheduled for today.
                  </Text>
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
          <Button
            variant="outline"
            onPress={() => router.push("/(app)/muraja/create-muraja-plan")}
          >
            Replace Current Plan
          </Button>
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
