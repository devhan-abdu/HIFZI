import React, { useState, useCallback } from "react";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { useFocusEffect } from "expo-router";
import { useNavigate } from "@/src/hooks/useNavigate";

import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { SectionHeader } from "@/src/components/SectionHeader";

import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";

import { WeeklyOverviewCard } from "@/src/features/muraja/components/WeeklyOverviewCard";
import { WeeklyMurajaSkeleton } from "@/src/features/muraja/components/skeletons";
import MurajaEmptyState from "@/src/features/muraja/components/MurajaEmptyState";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DayByDay } from "@/src/features/muraja/components/DayByDay";
import { ActionTaskCard } from "@/src/components/common/ActionCard";
import { EvaluationRequiredCard, RestDayCardSingle } from "@/src/components/dashboard/TodayTask";
import { Ionicons } from "@expo/vector-icons";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";
import { QualityModal } from "@/src/components/common/QualityModal";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";
import { useDashboardState } from "@/src/features/habits/hooks/useDashboardState";


export default function MurajaIndex() {
  const {
    weeklyPlan,
    stats,
    todayTask,
    weekProgress,
    loading,
    error,
    refetch,
    isRestDay,
  } = useWeeklyMuraja();

  const {
    state: dashboardState,
    refetchAll,
    isLoading: isStateLoading,
  } = useDashboardState('MURAJA', weeklyPlan, todayTask, !!isRestDay, loading, refetch);

  useFocusEffect(
    useCallback(() => {
      refetchAll();
    }, [refetchAll])
  );

  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, hideAlert } = useAlert();
  const [qualityModalVisible, setQualityModalVisible] = useState(false);
  const { push } = useNavigate();

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

  if (isStateLoading)
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
          <Button onPress={() => refetchAll()}>Try Again</Button>
        </View>
      </Screen>
    );
  }

  const title =
    todayTask?.startSurah === todayTask?.endSurah ?
      todayTask?.startSurah
    : `${todayTask?.startSurah} – ${todayTask?.endSurah}`;

  if (weeklyPlan) {
    const isEvalDue = dashboardState.type === 'EVALUATION_DUE';
    const isCompDue = dashboardState.type === 'PLAN_FINISHED';

    return (
      <Screen>
        <ScreenContent>
          <View className="mb-12">
            <WeeklyOverviewCard weeklyPlan={weeklyPlan} />

            <View className="mt-6 mb-4">
              <SectionHeader title="Next Milestone" />
              {isEvalDue ? (
                <EvaluationRequiredCard type="muraja" />
              ) : isCompDue ? (
                 <PlanEndCard activityType="MURAJA" localRefId={weeklyPlan.id} title="Muraja Plan" />
              ) : (dashboardState.type === 'TODAY_TASK' && todayTask) ? (
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
                    push(`/(app)/quran/reader?page=${todayTask.startPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayTask.startPage}&end=${todayTask.endPage}`);
                  }}
                  onDetails={() => push("/(app)/muraja/log")}
                />
              ) : (
                <RestDayCardSingle type="muraja" onLog={() => push("/(app)/muraja/log")} />
              )}
            </View>

            <View className="mt-10 mb-2 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Activity
              </Text>
              <Text className="text-xl text-gray-900 mb-5">
                Weekly Consistency
              </Text>
              <DayByDay progress={weekProgress ?? null} />
            </View>

            <View className="mt-10">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2 px-1">
                Insights
              </Text>
              <Text className="text-xl text-gray-900 mb-4 px-1">
                Muraja Analytics
              </Text>

              <View className="flex-row flex-wrap justify-between">
                <StatCard
                  title="Completed"
                  value={stats?.totalCompletedPages ?? 0}
                  unit="Pages"
                  icon="checkmark-done-circle-outline"
                />
                <StatCard
                  title="Remaining"
                  value={Math.max(0, (weeklyPlan.endPage ?? 604) - (stats?.currentPage ?? 0))}
                  unit="Pages"
                  icon="book-outline"
                />
                <StatCard
                  title="Current Streak"
                  value={stats?.streak ?? 0}
                  unit="Days"
                  icon="flame-outline"
                />
                <StatCard
                  title="Missed"
                  value={stats?.missedDaysCount ?? 0}
                  unit="Days"
                  type="danger"
                  icon="alert-circle-outline"
                />
              </View>
            </View>
          </View>
        </ScreenContent>

        <ScreenFooter>
          <View className="flex-row gap-x-3">
            <Button
              className={`flex-1 shadow-lg ${(isEvalDue || isCompDue) ? 'opacity-50' : 'shadow-primary/20'}`}
              onPress={() => !(isEvalDue || isCompDue) && push(`/(app)/muraja/log`)}
              disabled={isEvalDue || isCompDue}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="text-white">
                 {isEvalDue ? 'Test Required' : isCompDue ? 'Plan Completed' : 'Log Progress'}
              </Text>
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onPress={() => push("/(app)/muraja/create-muraja-plan")}
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
