import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { HifzActionCard } from "./HifzActionCard";
import { MurajaActionCard } from "./MurajaActionCard";
import { CardSkeleton } from "./Skeleton";

export const TodayTasksSection = () => {
  const router = useRouter();
  const {
    todayTask: todayPlan,
    loading: murajaLoading,
    weeklyPlan,
  } = useWeeklyMuraja();
  const {
    hifz,
    todayTask: hifzTodayTask,
    analytics: hifzAnalytics,
    loading: hifzLoading,
  } = useHifzDailyTask();

  if (murajaLoading || hifzLoading) {
    return [1, 2].map((index) => <CardSkeleton key={index} />);
  }

  return (
    <View className="gap-y-4">
      {hifz && hifzAnalytics && hifzTodayTask ?
        <HifzActionCard hifz={hifz} todayTask={hifzTodayTask} />
      : <EmptyTask
          message="No Hifz Plan for Today"
          ctaLabel="Log Any Hifz Activity"
          onPress={() => router.push("/hifz/log" as never)}
        />}

      {todayPlan ?
        <MurajaActionCard todayPlan={todayPlan} weeklyPlan={weeklyPlan} />
      : <EmptyTask
          message="No Muraja Task Today"
          ctaLabel="Log Any Revision"
          onPress={() => router.push("/muraja/log" as never)}
        />}
    </View>
  );
};

const EmptyTask = ({
  message,
  ctaLabel,
  onPress,
}: {
  message: string;
  ctaLabel: string;
  onPress: () => void;
}) => (
  <View className="bg-slate-50 border border-dashed border-slate-200 rounded-[24px] p-6 items-center">
    <Text className="text-slate-500 text-[10px] uppercase tracking-widest">{message}</Text>
    <Pressable onPress={onPress} className="mt-4 px-4 py-2 rounded-full bg-white border border-slate-200">
      <Text className="text-primary text-xs uppercase tracking-wide">{ctaLabel}</Text>
    </Pressable>
  </View>
);
