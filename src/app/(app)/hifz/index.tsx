import { EvaluationRequiredCard, RestDayCardSingle } from "@/src/components/dashboard/TodayTask";
import { ReinforcementCard } from "@/src/components/dashboard/ReinforcementCard";
import { NotificationCard } from "@/src/components/NotificationCard";
import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { DayByDay } from "@/src/features/hifz/components/DayByDay";
import HifzEmptyState from "@/src/features/hifz/components/HifzEmptyState";
import { HifzPlanOverviewCard } from "@/src/features/hifz/components/HifzPlanOverviewCard";
import { HifzTrackerSkeleton } from "@/src/features/hifz/components/skeleton";
import StatCard from "@/src/features/hifz/components/StatCard";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { getReviewPriorityColor } from "@/src/features/hifz/utils/reviewPriority";
import { getHifzPaceDelta, hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useMemo, useCallback } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useSession } from "@/src/hooks/useSession";
import { useNotifications } from "@/src/hooks/useNotifications";
import { sendTestNotification } from "@/src/utils/testNotifications";
import { HifzActionCard } from "@/src/components/dashboard/HifzActionCard";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";
import { useDashboardState } from "@/src/features/habits/hooks/useDashboardState";
export default function Hifz() {
  const { 
    hifz, 
    loading: isLoading, 
    error, 
    refetch, 
    reinforcementTask, 
    isReinforcementDone,
    todayTask, 
    dailyReviews,
  } = useHifzDailyTask();

  const {
    state: dashboardState,
    refetchAll,
    isLoading: isStateLoading,
  } = useDashboardState('HIFZ', hifz, todayTask, !todayTask, isLoading, refetch);

  useFocusEffect(
    useCallback(() => {
      refetchAll();
    }, [refetchAll])
  );
  const { user } = useSession();

  const handleSendTestNotification = async () => {
    if (!user?.id) return;
    await sendTestNotification(user.id, "xp");
  };

  const { items: surah } = useLoadSurahData();
  const { latestUnread } = useNotifications();

  const analytics = useMemo(() => {
    if (!hifz || !surah.length) return null;
    return hifzStatus(hifz, surah);
  }, [hifz, surah]);

  const pace = useMemo(() => {
    if (!hifz || !surah.length) return null;
    return getHifzPaceDelta(hifz, surah);
  }, [hifz, surah]);

  if (isStateLoading || (hifz && !analytics)) {
    return <HifzTrackerSkeleton />;
  }
  if (error) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-center text-gray-500 mb-4">
            Failed to load plan
          </Text>
          <Button onPress={() => refetchAll()}>
            <Text className="text-white">Retry</Text>
          </Button>
        </View>
      </Screen>
    );
  }
  if (!hifz) return <HifzEmptyState />;
  if (!analytics) return <HifzTrackerSkeleton />;

  const isEvalDue = dashboardState.type === 'EVALUATION_DUE';
  const isCompDue = dashboardState.type === 'PLAN_FINISHED';

  return (
    <>
      <Screen>
        <ScreenContent>
          {analytics && pace && (
            <HifzPlanOverviewCard
              startSurah={analytics.startSurah?.replace(/^Surah\s+/i, "") ?? ""}
              endSurah={analytics.endSurah?.replace(/^Surah\s+/i, "") ?? ""}
              targetEndDate={analytics.targetEndDate}
              totalPages={analytics.totalExpectedPages}
              completedPages={analytics.completedPages}
              progress={analytics.progress}
              remainingPages={analytics.remainingPages}
              currentSurah={analytics.currentSurah ?? ""}
              currentPage={analytics.currentPage}
              planEndPage={analytics.endPage}
              pagesPerDay={analytics.todayTarget}
              daysPerWeek={hifz.selectedDays?.length ?? 0}
              paceDelta={pace.delta}
            />
          )}
          
          <View className="mt-10 px-1">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
              Active Task
            </Text>
            <Text className="text-xl  text-gray-900 mb-4 px-1">Today Hifz</Text>
            {dashboardState.type === 'EVALUATION_DUE' ? (
               <EvaluationRequiredCard type="hifz" />
            ) : dashboardState.type === 'PLAN_FINISHED' ? (
               <PlanEndCard activityType="HIFZ" localRefId={hifz?.id ?? 0} title={analytics!.startSurah?.toString() ?? ''} />
            ) : dashboardState.type === 'TODAY_TASK' ? (
              <HifzActionCard
                hifz={hifz} 
                task={todayTask} 
                onDetails={() => router.push("/(app)/hifz/log")}
              />
            ) : (
              <RestDayCardSingle type="hifz" onLog={() => router.push("/(app)/hifz/log")} />
            )}
          </View>

          {reinforcementTask && (
            <View className="mt-10 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Memory Refresh
              </Text>
              <Text className="text-xl text-gray-900 mb-4">Keep it Fresh</Text>
              <ReinforcementCard
                task={{
                  ...reinforcementTask,
                  label: "Memory refresh",
                }}
                isCompleted={isReinforcementDone}
                onStart={() => {
                  router.push(`/(app)/quran/reader?page=${reinforcementTask.startPage}&planId=${hifz?.id}&type=hifz&start=${reinforcementTask.startPage}&end=${reinforcementTask.endPage}`);
                }}
              />
            </View>
          )}

          {dailyReviews.length > 0 && (
            <View className="mt-10 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Priority Review
              </Text>
              <Text className="text-xl text-gray-900 mb-4">Strengthen Your Heart</Text>
              <View className="gap-y-4">
                {dailyReviews.map((item) => (
                  <ReinforcementCard
                    key={item.slotId}
                    isCompleted={item.isCompleted}
                    task={{
                      startPage: item.startPage,
                      endPage: item.endPage,
                      actualPages: Array.from(
                        { length: item.endPage - item.startPage + 1 },
                        (_, i) => item.startPage + i,
                      ),
                      displaySurah:
                        item.startSurah === item.endSurah
                          ? item.startSurah
                          : `${item.startSurah} – ${item.endSurah}`,
                      priority: item.isCompleted ? undefined : item.priority,
                      badgeColor: item.isCompleted
                        ? undefined
                        : getReviewPriorityColor(item.priority),
                      label: item.isCompleted
                        ? "Review completed"
                        : item.overdueDays > 0
                          ? `${item.overdueDays}d overdue`
                          : "Due today",
                    }}
                    onStart={() => {
                      router.push(
                        `/(app)/quran/reader?page=${item.startPage}&planId=${hifz?.id}&type=hifz&start=${item.startPage}&end=${item.endPage}`,
                      );
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          <View className="mt-10 mb-2 px-1">
            <Text className="text-gray-400   uppercase tracking-[2px] text-[10px] mb-2">
              Activity
            </Text>

            <Text className="text-xl  text-gray-900 mb-5">
              Weekly Consistency
            </Text>

            <DayByDay plan={hifz} />
          </View>
          <View className="mt-10">
            <Text className="text-gray-400   uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Insights
            </Text>
            <Text className="text-xl  text-gray-900 mb-4 px-1">
              Plan Analytics
            </Text>

            <View className="flex-row flex-wrap justify-between">
              <StatCard
                title="Completed"
                value={analytics.completedPages}
                unit="Pages"
                icon="checkmark-done-circle-outline"
              />
              <StatCard
                title="Remaining"
                value={analytics.remainingPages}
                unit="Pages"
                icon="book-outline"
              />
              <StatCard
                title="Accuracy"
                value={analytics.accuracy}
                unit="Score"
                icon="trophy-outline"
              />
              <StatCard
                title="Missed"
                value={analytics.missedCount}
                unit="Days"
                type="danger"
                icon="alert-circle-outline"
              />
            </View>
          </View>
        </ScreenContent>
        <ScreenFooter>
          <View className="flex-row gap-x-3">
            <Button
              className={`flex-1 shadow-lg ${(isEvalDue || isCompDue) ? 'opacity-50' : 'shadow-primary/20'}`}
              onPress={() => !(isEvalDue || isCompDue) && router.push("/(app)/hifz/log")}
              disabled={isEvalDue || isCompDue}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white">
                {isEvalDue ? 'Test Required' : isCompDue ? 'Plan Completed' : 'Log Progress'}
              </Text>
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.push("/(app)/hifz/create-hifz-plan")}
            >
              <Ionicons name="create-outline" size={18} color="#276359" />
              <Text>
                Edit Plan
              </Text> 
            </Button>
          </View>
        </ScreenFooter>
      </Screen>
    </>
  );
}
