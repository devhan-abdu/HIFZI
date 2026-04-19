import { HifzActionCard } from "@/src/components/dashboard/HifzActionCard";
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
import { useGetHifzPlan } from "@/src/features/hifz/hook/useGetHifzPlan";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { useReviewSuggestions } from "@/src/features/hifz/hooks/useReviewSuggestions";
import { getReviewPriorityColor } from "@/src/features/hifz/utils/reviewPriority";
import { getPerformance } from "@/src/features/hifz/utils/plan-calculations";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { useSQLiteContext } from "expo-sqlite";
import { getLatestInAppNotification } from "@/src/services/notificationService";
import { useNotifications } from "@/src/hooks/useNotifications";
import { sendTestNotification } from "@/src/utils/testNotifications";

export default function Hifz() {
  const { hifz, isLoading, error, refetch } = useGetHifzPlan();
  const { todayTask } = useHifzDailyTask();
  const { suggestions } = useReviewSuggestions(hifz?.id);
  const { user } = useSession();
  const handleSendTestNotification = async () => {
    if (!user?.id) return;
    await sendTestNotification(db, user.id, "xp");
  };
  const db = useSQLiteContext();
  const { unreadCount } = useNotifications();
  const { items: surah } = useLoadSurahData();
  const latestNotificationQuery = useQuery({
    queryKey: ["latest-notification", user?.id],
    enabled: !!user?.id,
    queryFn: () => getLatestInAppNotification(db, user!.id),
    staleTime: 1000 * 20,
  });

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
          <Button onPress={() => refetch()}>Retry</Button>
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
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px]">
                HIFZI
              </Text>
              <Text className="text-2xl text-slate-900">Hifz</Text>
            </View>
            <Pressable
              onPress={() => router.push("/(app)/notifications" as never)}
              className="w-11 h-11 rounded-full bg-white border border-slate-200 items-center justify-center"
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#0f172a"
              />
              {unreadCount > 0 && (
                <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center">
                  <Text className="text-white text-[10px]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
          <View className="bg-primary rounded-[32px] p-6 shadow-xl shadow-black/10 border border-white/10">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-white/70   uppercase tracking-widest text-[10px] mb-1">
                  Current Goal
                </Text>
                <Text className="text-white text-3xl  mb-2">Daily Hifz</Text>

                <View
                  className={`flex-row items-center px-3 py-1 rounded-full mr-auto ${config.bg}`}
                >
                  <View
                    className={`w-1.5 h-1.5 rounded-full mr-2 ${config.dot}`}
                  />
                  <Text
                    className={`  text-[11px] uppercase tracking-wider ${config.color}`}
                  >
                    {config.value === 0 ?
                      config.label
                    : `${Math.abs(config.value)} Pages ${config.label}`}
                  </Text>
                </View>
              </View>

              <HifzOverViewCard
                progress={analytics.progress}
                remainingPages={analytics.remainingPages}
                currentSurah={analytics.currentSurah}
                strokeWidth={10}
              />
            </View>

            <View className="flex-row items-center border-t border-white/10 pt-5">
              <View className="pr-6 mr-6 border-r border-white/10">
                <Text className="text-white text-3xl ">
                  {analytics.todayTarget}
                </Text>
                <Text className="text-white/60 text-[10px]   uppercase">
                  Daily Pages
                </Text>
              </View>

              <View>
                <Text className="text-white text-lg ">
                  {analytics.targetEndDate}
                </Text>
                <Text className="text-white/60 text-[10px]   uppercase">
                  Target End Date
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-10">
            <Text className="text-gray-400   uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Focus
            </Text>
            <Text className="text-xl  text-gray-900 mb-4 px-1">Today Hifz</Text>
            {todayTask ?
              <HifzActionCard hifz={hifz} todayTask={todayTask} />
            : <View className="bg-slate-50 border border-dashed border-slate-200 rounded-[24px] p-6 items-center">
                <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
                  No task today, you can still log progress
                </Text>
              </View>
            }
          </View>

          <View className="mt-8 px-1">
            <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
              Review
            </Text>
            <Text className="text-xl text-gray-900 mb-4">
              📚 Review for Today
            </Text>
            {suggestions.length > 0 ?
              <View className="gap-y-3">
                {suggestions.slice(0, 5).map((item) => {
                  const color = getReviewPriorityColor(item.priority);
                  return (
                    <Pressable
                      key={`${item.sourceLogId}-${item.cycleDay}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                      onPress={() =>
                        router.push(
                          `/(app)/hifz/log?reviewStartPage=${item.startPage}&reviewEndPage=${item.endPage}&reviewCycleDay=${item.cycleDay}` as never,
                        )
                      }
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-slate-900 text-sm">
                          {item.startSurah === item.endSurah ?
                            item.startSurah
                          : `${item.startSurah} - ${item.endSurah}`}
                        </Text>
                        <View
                          className={`px-2 py-1 rounded-full ${color.badge}`}
                        >
                          <Text
                            className={`text-[10px] uppercase tracking-wide ${color.text}`}
                          >
                            {item.priority}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-slate-600 text-xs">
                        Pages {item.startPage}-{item.endPage} · Cycle{" "}
                        {item.cycleDay} · Due {item.dueDate}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            : <View className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <Text className="text-emerald-700 text-sm">
                  You&apos;re all caught up 🎉
                </Text>
              </View>
            }
          </View>

          {latestNotificationQuery.data && (
            <View className="mt-8 px-1">
              <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
                Live Progress
              </Text>
              <NotificationCard
                title={latestNotificationQuery.data.title}
                message={latestNotificationQuery.data.message}
                type={latestNotificationQuery.data.type}
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
            <Pressable
              className="flex-1 bg-primary h-14 rounded-2xl px-4 flex-row items-center justify-start shadow-lg shadow-primary/20 active:opacity-90"
              onPress={() => router.push(`/(app)/hifz/log`)}
            >
              <View className="bg-white/20 p-1.5 rounded-full mr-3">
                <Ionicons name="add" size={20} color="white" />
              </View>
              <Text className="text-white  text-lg tracking-tight">
                Log Today's Hifz
              </Text>
            </Pressable>

            <Pressable
              className="flex-1 bg-white h-14 rounded-2xl px-4 flex-row items-center justify-start border border-primary shadow-sm active:opacity-90"
              onPress={() => router.push("/(app)/hifz/create-hifz-plan")}
            >
              <View className="bg-primary/10 p-1.5 rounded-full mr-3">
                <Ionicons name="create-outline" size={18} color="#276359" />
              </View>
              <Text className="text-primary   text-lg tracking-tight">
                Edit Plan
              </Text>
            </Pressable>
          </View>
        </ScreenFooter>
      </Screen>
    </>
  );
}
