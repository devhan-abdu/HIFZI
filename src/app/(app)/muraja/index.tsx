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
import { WeeklyOverviewCard } from "@/src/features/muraja/components/WeeklyOverviewCard";
import { WeeklyMurajaSkeleton } from "@/src/features/muraja/components/skeletons";
import MurajaEmptyState from "@/src/features/muraja/components/MurajaEmptyState";
import StatCard from "@/src/features/hifz/components/StatCard";
import { DayByDay } from "@/src/features/muraja/components/DayByDay";
import { ActionTaskCard } from "@/src/components/common/ActionCard";
import { Ionicons } from "@expo/vector-icons";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";
import { useAppActiveRefresh } from "@/src/hooks/useAppActiveRefresh";
import { getSurahByPage } from "@/src/features/muraja/utils/quranMapping";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useMurajaCardState } from "@/src/features/muraja/hooks/useMurajaCardState";
import { useMurajaAnalytics } from "@/src/features/muraja/hooks/useMurajaAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { MurajaCard } from "@/src/features/muraja/components/MurajaCard";

export default function MurajaIndex() {
  const { push } = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { alertConfig, hideAlert } = useAlert();
  const { items: surahData } = useLoadSurahData();

  const cardState = useMurajaCardState();
  const analyticsData = useMurajaAnalytics();
  const { weeklyPlan, stats, dayProgress, today_extra_sessions } =
    analyticsData ?? {};

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user?.id] });
  }, [queryClient, user?.id]);

  useFocusEffect(
    useCallback(() => {
      invalidate();
    }, [invalidate]),
  );
  useAppActiveRefresh(
    useCallback(() => {
      invalidate();
    }, [invalidate]),
  );

  if (cardState.type === "LOADING")
    return (
      <Screen>
        <WeeklyMurajaSkeleton />
      </Screen>
    );
  if (cardState.type === "NO_PLAN" || !weeklyPlan)
    return (
      <Screen>
        <MurajaEmptyState />
      </Screen>
    );

  const isBlocked =
    cardState.type === "EVALUATION_DUE" || cardState.type === "PLAN_FINISHED";

  const task =
    (
      cardState.type === "PLANNED_DAY" ||
      cardState.type === "CATCHUP_DAY" ||
      cardState.type === "COMPLETED_TODAY"
    ) ?
      cardState.task
    : null;

  const handleTakeTest = () => {
    if (!task) return;
    const pages = Array.from(
      { length: task.endPage - task.startPage + 1 },
      (_, i) => task.startPage + i,
    );
    push(`/(app)/test/exam?pages=${JSON.stringify(pages)}&type=MURAJA`);
  };

  return (
    <Screen>
      <ScreenContent>
        <View className="mb-12">
          <WeeklyOverviewCard
            weeklyPlan={weeklyPlan}
            stats={stats ?? null}
          />

          <View className="mt-6 mb-4">
            <SectionHeader title="Next Milestone" />
            <MurajaCard onLog={() => push("/(app)/muraja/log")} />

            {task && (
              <Button
                variant="outline"
                onPress={handleTakeTest}
                className="border-primary/20 mt-3"
              >
                <Ionicons name="school-outline" size={17} color="#276359" />
                <Text className="text-primary">Take Today's Test</Text>
              </Button>
            )}
          </View>

          {/* Extra Sessions */}
          {(today_extra_sessions?.length ?? 0) > 0 && (
            <View className="mt-6 mb-4">
              <SectionHeader title="Extra Sessions" />
              <View className="gap-y-3">
                {today_extra_sessions!.map((session: any) => {
                  const startS =
                    getSurahByPage(session.start_page, surahData) ?? "";
                  const endPage =
                    session.start_page + session.completed_pages - 1;
                  const endS = getSurahByPage(endPage, surahData) ?? "";
                  const sessionTitle =
                    startS === endS ? startS : `${startS} – ${endS}`;
                  return (
                    <ActionTaskCard
                      key={session.id}
                      typeLabel="Extra Session"
                      title={sessionTitle}
                      subTitle={`${session.completed_pages} pages done · ${session.start_page}–${endPage}`}
                      status="completed"
                      isLoading={false}
                      onDone={() => {}}
                      onStart={() =>
                        push(
                          `/(app)/quran/reader?page=${session.start_page}&type=muraja&start=${session.start_page}&end=${endPage}`,
                        )
                      }
                      onDetails={() => {}}
                      hideActionButtons={true}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Weekly Consistency */}
          <View className="mt-10 mb-2 px-1">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
              Activity
            </Text>
            <Text className="text-xl text-gray-900 mb-5">
              Weekly Consistency
            </Text>
            <DayByDay progress={dayProgress ?? null} />
          </View>

          {/* Stats */}
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
                value={Math.max(
                  0,
                  (weeklyPlan?.endPage ?? 604) - (stats?.currentPage ?? 0),
                )}
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
            className={`flex-1 shadow-lg ${isBlocked ? "opacity-50" : "shadow-primary/20"}`}
            onPress={() => !isBlocked && push("/(app)/muraja/log")}
            disabled={isBlocked}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text className="text-white">
              {cardState.type === "EVALUATION_DUE" ?
                "Test Required"
              : cardState.type === "PLAN_FINISHED" ?
                "Plan Completed"
              : "Log Progress"}
            </Text>
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onPress={() => push("/(app)/muraja/create-muraja-plan")}
          >
            <Ionicons name="pencil-outline" size={18} color="#276359" />
            <Text className="text-primary">Edit Plan</Text>
          </Button>
        </View>
      </ScreenFooter>

      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </Screen>
  );
}
