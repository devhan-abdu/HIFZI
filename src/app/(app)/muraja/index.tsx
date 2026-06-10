import React, { useCallback } from "react";
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

import { WeeklyOverviewCard } from "@/src/features/muraja/components/WeeklyOverviewCard";
import { WeeklyMurajaSkeleton } from "@/src/features/muraja/components/skeletons";
import MurajaEmptyState from "@/src/features/muraja/components/MurajaEmptyState";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DayByDay } from "@/src/features/muraja/components/DayByDay";
import { MurajaActionCard } from "@/src/components/dashboard/MurajaActionCard";
import { ActionTaskCard } from "@/src/components/common/ActionCard";
import { EvaluationRequiredCard, RestDayCardSingle } from "@/src/components/dashboard/TodayTask";
import { Ionicons } from "@expo/vector-icons";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";
import { useDashboardState } from "@/src/features/habits/hooks/useDashboardState";
import { useAppActiveRefresh } from "@/src/hooks/useAppActiveRefresh";
import { getSurahByPage } from "@/src/features/muraja/utils/quranMapping";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";

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
    today_extra_sessions,
  } = useWeeklyMuraja();

  const { items: surahData } = useLoadSurahData();

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
  useAppActiveRefresh(useCallback(() => {
    refetchAll();
  }, [refetchAll]));

  const { alertConfig, hideAlert } = useAlert();
  const { push } = useNavigate();

  const handleTakeTest = () => {
    if (!todayTask) return;
    const pages = Array.from(
      { length: todayTask.endPage - todayTask.startPage + 1 },
      (_, i) => todayTask.startPage + i,
    );
    push(`/(app)/test/exam?pages=${JSON.stringify(pages)}&type=MURAJA`);
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

    return (
      <Screen>
        <ScreenContent>
          <View className="mb-12">
            <WeeklyOverviewCard weeklyPlan={weeklyPlan} stats={stats ?? null} />

            <View className="mt-6 mb-4">
              <SectionHeader title="Next Milestone" />
              {dashboardState.type === 'EVALUATION_DUE' ? (
                <EvaluationRequiredCard type="muraja" />
              ) : dashboardState.type === 'PLAN_FINISHED' ? (
                 <PlanEndCard activityType="MURAJA" localRefId={weeklyPlan.id} title="Muraja Plan" />
              ) : (dashboardState.type === 'COMPLETED_TODAY' || dashboardState.type === 'PLANNED_DAY' || dashboardState.type === 'CATCHUP_DAY') ? (
                <View className="gap-y-3">
                  <MurajaActionCard
                    todayPlan={dashboardState.task}
                    weeklyPlan={weeklyPlan}
                    onDetails={() => push("/(app)/muraja/log")}
                  />
                  <Button
                    variant="outline"
                    onPress={handleTakeTest}
                    className="border-primary/20"
                  >
                    <Ionicons name="school-outline" size={17} color="#276359" />
                    <Text className="text-primary">Take Today's Test</Text>
                  </Button>
                </View>
              ) : dashboardState.type === 'REST_DAY' ? (
                <RestDayCardSingle type="muraja" onLog={() => push("/(app)/muraja/log")} />
              ) : null}
            </View>

            {today_extra_sessions && today_extra_sessions.length > 0 && (
              <View className="mt-6 mb-4">
                <SectionHeader title="Extra Sessions" />
                <View className="gap-y-3">
                  {today_extra_sessions.map((session: any) => {
                    const startS = getSurahByPage(session.start_page, surahData) ?? "";
                    const endPage = session.start_page + session.completed_pages - 1;
                    const endS = getSurahByPage(endPage, surahData) ?? "";
                    const title = startS === endS ? startS : `${startS} – ${endS}`;
                    const subTitle = `${session.completed_pages} pages done · ${session.start_page}–${endPage}`;
                    
                    return (
                      <ActionTaskCard
                        key={session.id}
                        typeLabel="Extra Session"
                        title={title}
                        subTitle={subTitle}
                        status="completed"
                        isLoading={false}
                        onDone={() => {}}
                        onStart={() => push(`/(app)/quran/reader?page=${session.start_page}&type=muraja&start=${session.start_page}&end=${endPage}`)}
                        onDetails={() => {}}
                        hideActionButtons={true}
                      />
                    );
                  })}
                </View>
              </View>
            )}

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
                  title="Accuracy"
                  value={stats?.accuracy ?? 100}
                  unit="Score"
                  icon="trophy-outline"
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
              className={`flex-1 shadow-lg ${(dashboardState.type === 'EVALUATION_DUE' || dashboardState.type === 'PLAN_FINISHED') ? 'opacity-50' : 'shadow-primary/20'}`}
              onPress={() => !(dashboardState.type === 'EVALUATION_DUE' || dashboardState.type === 'PLAN_FINISHED') && push(`/(app)/muraja/log`)}
              disabled={dashboardState.type === 'EVALUATION_DUE' || dashboardState.type === 'PLAN_FINISHED'}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="text-white">
                 {dashboardState.type === 'EVALUATION_DUE' ? 'Test Required' : dashboardState.type === 'PLAN_FINISHED' ? 'Plan Completed' : 'Log Progress'}
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
