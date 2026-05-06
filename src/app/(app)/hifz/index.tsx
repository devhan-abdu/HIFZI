import { HifzActionCard } from "@/src/components/dashboard/HifzActionCard";
import { ReinforcementCard } from "@/src/components/dashboard/ReinforcementCard";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";
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
export default function Hifz() {
  const { 
    hifz, 
    loading: isLoading, 
    error, 
    refetch, 
    reinforcementTask, 
    isReinforcementDone,
    todayTask, 
    srsSuggestions: suggestions 
  } = useHifzDailyTask();
  const { user } = useSession();
  
  const session = useReaderSessionStore();

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
            {todayTask ?
              <HifzActionCard 
                hifz={hifz} 
                task={todayTask} 
                onStart={() => {
                  session.openSession(todayTask.startPage);
                  router.push(`/(app)/quran/reader?page=${todayTask.startPage}&planId=${hifz.id}&type=hifz&start=${todayTask.startPage}&end=${todayTask.endPage}`);
                }}
                onResume={() => {
                  router.push(`/(app)/quran/reader?page=${session.currentPage}&planId=${hifz?.id}&type=hifz&start=${todayTask.startPage}&end=${todayTask.endPage}`);
                }}
                onDetails={() => router.push("/(app)/hifz/log")}
              />
            : <View className="bg-white border border-slate-100 rounded-[32px] p-8 items-center shadow-sm">
                <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="cafe-outline" size={24} color="#276359" />
                </View>
                <Text className="text-slate-900 text-base text-center mb-1">Rest Day</Text>
                <Text className="text-slate-500 text-xs text-center mb-6 px-4">
                  No new tasks scheduled today. Focus on reviews or reinforcement below.
                </Text>
                <Button 
                  variant="outline" 
                  className="w-full border-slate-100 bg-slate-50"
                  onPress={() => router.push("/(app)/hifz/log")}
                >
                  <Text style={{ color: '#276359' }} className="text-xs uppercase tracking-widest ">Log Extra Session</Text>
                </Button>
              </View>
            }
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
                  session.openSession(reinforcementTask.startPage);
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
              <View className="gap-y-3">
                {suggestions.slice(0, 3).map((item) => {
                  const color = getReviewPriorityColor(item.priority);
                  return (
                    <Pressable
                      key={`${item.sourceLogId}-${item.cycleDay}`}
                      className="rounded-[24px] border border-slate-100 bg-white p-5 flex-row items-center justify-between shadow-sm active:scale-[0.98]"
                      onPress={() =>
                        router.push(
                          `/(app)/hifz/log?reviewStartPage=${item.startPage}&reviewEndPage=${item.endPage}&reviewCycleDay=${item.cycleDay}` as never,
                        )
                      }
                    >
                      <View>
                        <Text className="text-slate-900 text-base mb-1">
                          {item.startSurah === item.endSurah ? item.startSurah : `${item.startSurah} - ${item.endSurah}`}
                        </Text>
                        <Text className="text-slate-500 text-[10px] uppercase tracking-wider">
                          Pages {item.startPage}-{item.endPage} · {item.overdueDays > 0 ? `${item.overdueDays}d overdue` : 'Due today'}
                        </Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${color.badge}`}>
                        <Text className={`text-[9px] uppercase tracking-widest ${color.text}`}>
                          {item.priority}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {suggestions.length > 3 && (
             <View className="mt-10 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Upcoming Reviews
              </Text>
              <View className="gap-y-3">
                {suggestions.slice(3, 6).map((item) => {
                  const color = getReviewPriorityColor(item.priority);
                  return (
                    <Pressable
                      key={`${item.sourceLogId}-${item.cycleDay}`}
                      className="rounded-2xl border border-slate-100 bg-white p-4"
                      onPress={() =>
                        router.push(
                          `/(app)/hifz/log?reviewStartPage=${item.startPage}&reviewEndPage=${item.endPage}&reviewCycleDay=${item.cycleDay}` as never,
                        )
                      }
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-slate-900 text-sm">
                          {item.startSurah === item.endSurah ? item.startSurah : `${item.startSurah} - ${item.endSurah}`}
                        </Text>
                        <View className={`px-2 py-1 rounded-full ${color.badge}`}>
                          <Text className={`text-[10px] uppercase tracking-wide ${color.text}`}>
                            {item.priority}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-slate-600 text-xs">
                        Pages {item.startPage}-{item.endPage} · Due {item.dueDate}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {latestUnread && (
            <View className="mt-8 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Live Progress
              </Text>
              <NotificationCard
                title={latestUnread.title}
                message={latestUnread.message}
                type={latestUnread.type as any}
              />
            </View>
          )}
          {__DEV__ && (
            <Pressable
              onPress={handleSendTestNotification}
              className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4"
            >
              <Text className="text-violet-700 text-sm">
                Send Test Notification
              </Text>
            </Pressable>
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
              className="flex-1 shadow-lg shadow-primary/20"
              onPress={() => router.push("/(app)/hifz/log")}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white">
            Log Progress
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
