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
import { ReinforcementCard } from "@/src/components/dashboard/ReinforcementCard";
import { useHifzCardState } from "@/src/features/hifz/hooks/useHifzCardState";
import { useHifzAnalytics } from "@/src/features/hifz/hooks/useHifzAnalytics";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import { getReviewPriorityColor } from "@/src/features/hifz/utils/reviewPriority";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useNavigate } from "@/src/hooks/useNavigate";
import { useCallback } from "react";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useAppActiveRefresh } from "@/src/hooks/useAppActiveRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { HifzCard } from "@/src/features/hifz/components/HifzCard";
import { IHifzPlan } from "@/src/features/hifz/types";

export default function Hifz() {
  const { push } = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const cardState = useHifzCardState();

  const { hifz } = useHifzPlan();

  const {
    analytics,
    pace,
    reinforcementTask,
    isReinforcementDone,
    dailyReviews,
  } = useHifzAnalytics() ?? {};

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hifz", user?.id] });
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

  if (cardState.type === "LOADING") return <HifzTrackerSkeleton />;
  if (cardState.type === "NO_PLAN") return <HifzEmptyState />;

  const isBlocked =
    cardState.type === "EVALUATION_DUE" || cardState.type === "PLAN_FINISHED";

  return (
    <Screen>
      <ScreenContent>
        {/* Plan Overview */}
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
            daysPerWeek={hifz?.selectedDays?.length ?? 0}
            paceDelta={pace.delta}
          />
        )}

        <View className="mt-10 px-1">
          <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2">
            Active Task
          </Text>
          <Text className="text-xl text-text mb-4 px-1">Today Hifz</Text>
          <HifzCard onLog={() => push("/(app)/hifz/log")} />
        </View>

        {reinforcementTask && (
          <View className="mt-10 px-1">
            <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2">
              Memory Refresh
            </Text>
            <Text className="text-xl text-text mb-4">Keep it Fresh</Text>
            <ReinforcementCard
              task={{ ...reinforcementTask, label: "Memory refresh" }}
              isCompleted={isReinforcementDone ?? false}
              onStart={() =>
                push(
                  `/(app)/quran/reader?page=${reinforcementTask.startPage}&planId=${hifz?.id}&type=hifz&start=${reinforcementTask.startPage}&end=${reinforcementTask.endPage}`,
                )
              }
            />
          </View>
        )}

        {(dailyReviews?.length ?? 0) > 0 && (
          <View className="mt-10 px-1">
            <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2">
              Priority Review
            </Text>
            <Text className="text-xl text-text mb-4">
              Strengthen Your Heart
            </Text>
            <View className="gap-y-4">
              {dailyReviews!.map((item) => (
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
                      item.startSurah === item.endSurah ?
                        item.startSurah
                      : `${item.startSurah} – ${item.endSurah}`,
                    priority: item.isCompleted ? undefined : item.priority,
                    badgeColor:
                      item.isCompleted ? undefined : (
                        getReviewPriorityColor(item.priority)
                      ),
                    label:
                      item.isCompleted ? "Review completed"
                      : item.overdueDays > 0 ? `${item.overdueDays}d overdue`
                      : "Due today",
                  }}
                  onStart={() =>
                    push(
                      `/(app)/quran/reader?page=${item.startPage}&planId=${hifz?.id}&type=hifz&start=${item.startPage}&end=${item.endPage}`,
                    )
                  }
                />
              ))}
            </View>
          </View>
        )}

        <View className="mt-10 mb-2 px-1">
          <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2">
            Activity
          </Text>
          <Text className="text-xl text-text mb-5">Weekly Consistency</Text>
          <DayByDay plan={hifz as IHifzPlan} />
        </View>

        {analytics && (
          <View className="mt-10">
            <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-2 px-1">
              Insights
            </Text>
            <Text className="text-xl text-text mb-4 px-1">
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
        )}
      </ScreenContent>

      <ScreenFooter>
        <View className="flex-row gap-x-3">
          <Button
            className={`flex-1 shadow-lg ${isBlocked ? "opacity-50" : "shadow-primary/20"}`}
            onPress={() => !isBlocked && push("/(app)/hifz/log")}
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
            onPress={() => push("/(app)/hifz/create-hifz-plan")}
          >
            <Ionicons name="create-outline" size={18} color="#276359" />
            <Text>Edit Plan</Text>
          </Button>
        </View>
      </ScreenFooter>
    </Screen>
  );
}
