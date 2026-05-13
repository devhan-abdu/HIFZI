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
import HifzOverViewCard from "@/src/features/hifz/components/HifzOverviewCard";
import { HifzTrackerSkeleton } from "@/src/features/hifz/components/skeleton";
import StatCard from "@/src/features/hifz/components/StatCard";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { getReviewPriorityColor } from "@/src/features/hifz/utils/reviewPriority";
import { getPerformance } from "@/src/features/hifz/utils/plan-calculations";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useSession } from "@/src/hooks/useSession";
import { useNotifications } from "@/src/hooks/useNotifications";
import { sendTestNotification } from "@/src/utils/testNotifications";
import { HifzActionCard } from "@/src/components/dashboard/HifzActionCard";
import { usePlanLifecycle } from "@/src/features/habits/hooks/usePlanLifecycle";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";

export default function Hifz() {
  const { 
    hifz, 
    loading: isLoading, 
    error, 
    refetch, 
    reinforcementTask, 
    isReinforcementDone,
    todayTask, 
    srsSuggestions: suggestions,
    completedReviews
  } = useHifzDailyTask();
  const { getPlanState } = usePlanLifecycle();
  const planState = getPlanState(hifz?.id, 'HIFZ');
  const { user } = useSession();

  const handleSendTestNotification = async () => {
    if (!user?.id) return;
    await sendTestNotification(user.id, "xp");
  };

  const { items: surah } = useLoadSurahData();
  const { latestUnread } = useNotifications();

  const analytics = useMemo(() => {
    if (!hifz || !surah) return null;
    return hifzStatus(hifz, surah);
  }, [hifz, surah]);

  if (isLoading || (hifz && !analytics)) {
    return <HifzTrackerSkeleton />;
  }
  if (error) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-center text-gray-500 mb-4">
            Failed to load plan
          </Text>
          <Button onPress={() => refetch()}>
            <Text className="text-white">Retry</Text>
          </Button>
        </View>
      </Screen>
    );
  }
  if (!hifz) return <HifzEmptyState />;
  if (!analytics) return <HifzTrackerSkeleton />;

  const config = getPerformance(
    analytics.plannedPages - analytics.completedPages,
  );

  return (
    <>
      <Screen>
        <ScreenContent>
          <View className="bg-primary rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-1">
                  <Text className="text-white/70 text-[10px] uppercase tracking-widest mb-2">Quran Journey</Text>

                <View className="flex-row items-center gap-2 ">
                  <Text className="text-white text-xl tracking-tighter leading-tight">
                    {analytics?.startSurah?.replace(/^Surah\s+/i, '')} — {analytics?.endSurah?.replace(/^Surah\s+/i, '')}
                  </Text>
                </View>
                <View className={`flex-row items-center px-2 py-0.5 rounded-full mr-auto mt-2 ${config.bg} border border-white/10`}>
                  <View className={`w-1 h-1 rounded-full mr-1.5 ${config.dot}`} />
                  <Text className={`text-[9px]  uppercase tracking-wider ${config.color}`}>
                    {config.value === 0 ? config.label : `${Math.abs(config.value)} Pgs ${config.label}`}
                  </Text>
                </View>
              </View>

              <HifzOverViewCard
                progress={analytics.progress}
                remainingPages={analytics.remainingPages}
                currentSurah={analytics.currentSurah}
                strokeWidth={8}
              />
            </View>

            <View className="w-full h-[2px] bg-white/10 rounded-full mb-8" />

            <View className="flex-row items-center">
              <View className="pr-6 mr-6 border-r border-white/10">
                <Text className="text-white text-3xl tracking-tight leading-7">
                  {analytics.todayTarget}
                </Text>
                <Text className="text-white/50 text-[9px] uppercase tracking-widest mt-1">
                  Daily Target
                </Text>
              </View>

              <View>
                <Text className="text-white text-xl tracking-tight leading-6">
                  {analytics.targetEndDate}
                </Text>
                <Text className="text-white/50 text-[9px] uppercase tracking-widest mt-1">
                  Est. Completion
                </Text>
              </View>
            </View>
          </View>
          
          <View className="mt-10 px-1">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
              Active Task
            </Text>
            <Text className="text-xl  text-gray-900 mb-4 px-1">Today Hifz</Text>
            {planState === 'EVALUATION_DUE' ? (
               <EvaluationRequiredCard type="hifz" />
            ) : planState === 'COMPLETION_DUE' ? (
               <PlanEndCard activityType="HIFZ" localRefId={hifz?.id ?? 0} title={analytics!.startSurah?.toString() ?? ''} />
            ) : todayTask ? (
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
                task={reinforcementTask}
                isCompleted={isReinforcementDone}
                onStart={() => {
                  router.push(`/(app)/quran/reader?page=${reinforcementTask.startPage}&planId=${hifz?.id}&type=hifz&start=${reinforcementTask.startPage}&end=${reinforcementTask.endPage}`);
                }}
              />
            </View>
          )}

          {suggestions.length > 0 && (
            <View className="mt-10 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Priority Review
              </Text>
              <Text className="text-xl text-gray-900 mb-4">Strengthen Your Heart</Text>
              <View className="gap-y-4">
                {completedReviews.map((item, idx) => (
                  <ReinforcementCard
                    key={`completed-${idx}`}
                    isCompleted={true}
                    task={{
                      startPage: item.startPage,
                      endPage: item.endPage,
                      actualPages: [],
                      displaySurah: item.startSurah === item.endSurah ? item.startSurah : `${item.startSurah} - ${item.endSurah}`,
                      label: 'Review Completed'
                    }}
                    onStart={() => {}}
                  />
                ))}

                {/* Due Reviews */}
                {suggestions.slice(0, 3).map((item) => (
                  <ReinforcementCard
                    key={`${item.sourceLogId}-${item.cycleDay}`}
                    task={{
                      startPage: item.startPage,
                      endPage: item.endPage,
                      actualPages: Array.from({ length: item.endPage - item.startPage + 1 }, (_, i) => item.startPage + i),
                      displaySurah: item.startSurah === item.endSurah ? item.startSurah : `${item.startSurah} - ${item.endSurah}`,
                      priority: item.priority,
                      badgeColor: getReviewPriorityColor(item.priority),
                      label: item.overdueDays > 0 ? `${item.overdueDays}d overdue` : 'Due today'
                    }}
                    onStart={() => {
                      router.push(`/(app)/quran/reader?page=${item.startPage}&planId=${hifz?.id}&type=hifz&start=${item.startPage}&end=${item.endPage}`);
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {suggestions.length > 3 && (
             <View className="mt-10 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Upcoming Reviews
              </Text>
              <View>
                {suggestions.slice(3, 6).map((item) => (
                  <ReinforcementCard
                    key={`${item.sourceLogId}-${item.cycleDay}`}
                    task={{
                      startPage: item.startPage,
                      endPage: item.endPage,
                      actualPages: Array.from({ length: item.endPage - item.startPage + 1 }, (_, i) => item.startPage + i),
                      displaySurah: item.startSurah === item.endSurah ? item.startSurah : `${item.startSurah} - ${item.endSurah}`,
                      priority: item.priority,
                      badgeColor: getReviewPriorityColor(item.priority),
                      label: `Due ${item.dueDate}`
                    }}
                    onStart={() => {
                      router.push(`/(app)/quran/reader?page=${item.startPage}&planId=${hifz?.id}&type=hifz&start=${item.startPage}&end=${item.endPage}`);
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
              className={`flex-1 shadow-lg ${planState === 'EVALUATION_DUE' ? 'opacity-50' : 'shadow-primary/20'}`}
              onPress={() => planState !== 'EVALUATION_DUE' && router.push("/(app)/hifz/log")}
              disabled={planState === 'EVALUATION_DUE'}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white">
                {planState === 'EVALUATION_DUE' ? 'Test Required' : 'Log Progress'}
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
