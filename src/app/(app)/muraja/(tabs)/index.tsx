import React, { useState } from "react";
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
import { EvaluationRequiredCard, RestDayCardSingle } from "@/src/components/dashboard/TodayTask";
import { Ionicons } from "@expo/vector-icons";
import { usePlanLifecycle } from "@/src/features/habits/hooks/usePlanLifecycle";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";
import { QualityModal } from "@/src/components/common/QualityModal";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";


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
  const { getPlanState } = usePlanLifecycle();
  const planState = getPlanState(weeklyPlan?.id, 'MURAJA');

  const {
    analytics,
    plan: reviewPlan,
    isLoading: loadingReview,
  } = useWeeklyReview();
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, hideAlert } = useAlert();
  const [qualityModalVisible, setQualityModalVisible] = useState(false);

  const handleUpdate = async (status: "completed" | "pending" | "missed", quality?: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompleted = status === "completed";

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
        hesitation_count: 0,
        quality_score: quality
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
              <SectionHeader title="Next Milestone" />
              {planState === 'EVALUATION_DUE' ? (
                <EvaluationRequiredCard type="muraja" />
              ) : planState === 'COMPLETION_DUE' ? (
                 <PlanEndCard activityType="MURAJA" localRefId={weeklyPlan.id} title="Muraja Plan" />
              ) : todayTask ? (
                <ActionTaskCard
                  typeLabel="Muraja'a"
                  title={title ?? ''}
                  subTitle={`Pages ${todayTask.startPage} – ${todayTask.endPage}`}
                  status={todayTask.status} 
                  isCatchup={todayTask.isCatchup}
                  isLoading={isUpdating}
                  onDone={() => {
                    if (todayTask.status === "completed" || todayTask.status === "partial") {
                        handleUpdate("pending");
                    } else {
                        setQualityModalVisible(true);
                    }
                  }}
                  onStart={() => {
                    router.push(`/(app)/quran/reader?page=${todayTask.startPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayTask.startPage}&end=${todayTask.endPage}`);
                  }}
                  onDetails={() => router.push("/(app)/muraja/log")}
                />
              ) : (
                <RestDayCardSingle type="muraja" onLog={() => router.push("/(app)/muraja/log")} />
              )}
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
              className={`flex-1 shadow-lg ${planState === 'EVALUATION_DUE' ? 'opacity-50' : 'shadow-primary/20'}`}
              onPress={() => planState !== 'EVALUATION_DUE' && router.push(`/(app)/muraja/log`)}
              disabled={planState === 'EVALUATION_DUE'}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="text-white">
                 {planState === 'EVALUATION_DUE' ? 'Test Required' : 'Log Progress'}
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
        <QualityModal
          visible={qualityModalVisible}
          onClose={() => setQualityModalVisible(false)}
          onSelect={(score) => {
            setQualityModalVisible(false);
            handleUpdate("completed", score);
          }}
          title="Rate your Muraja session"
        />
        <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
      </Screen>
    );
  }

  return (
    <Screen>
      <MurajaEmptyState />
    </Screen>
  );
}
