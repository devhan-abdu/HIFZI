import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { HifzActionCard } from "./HifzActionCard";
import { MurajaActionCard } from "./MurajaActionCard";
import { CardSkeleton } from "./Skeleton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";

import { usePlanLifecycle } from "@/src/features/habits/hooks/usePlanLifecycle";
import { useWeeklyEvaluationTrigger } from "@/src/features/habits/hooks/useWeeklyEvaluationTrigger";

export const TodayTasksSection = ({ 
  onLogHifz, 
  onLogMuraja,
}: { 
  onLogHifz: () => void; 
  onLogMuraja: () => void;
}) => {
  const {
    todayTask: todayPlan,
    loading: murajaLoading,
    weeklyPlan,
  } = useWeeklyMuraja();
  const {
    hifz,
    todayTask: hifzTodayTask,
    loading: hifzLoading,
  } = useHifzDailyTask();

  const { getPlanState } = usePlanLifecycle();
  const { duePlans } = useWeeklyEvaluationTrigger();

  const hifzEvalDue = duePlans.some((p) => p.activityType === "HIFZ");
  const murajaEvalDue = duePlans.some((p) => p.activityType === "MURAJA");

  const hifzState = hifzEvalDue
    ? "EVALUATION_DUE"
    : getPlanState(hifz?.id, "HIFZ");
  const murajaState = murajaEvalDue
    ? "EVALUATION_DUE"
    : getPlanState(weeklyPlan?.id, "MURAJA");


  if (murajaLoading || hifzLoading) {
    return [1, 2].map((index) => <CardSkeleton key={index} />);
  }

  const hasMurajaTask = !!todayPlan;
  const hasAnyPlan = !!(hifz || weeklyPlan);

  if (!hasAnyPlan) return null;

  return (
    <View className="gap-y-4">
      {/* Hifz Slot */}
      {hifzState === 'EVALUATION_DUE' ? (
          <EvaluationRequiredCard type="hifz" />
      ) : hifzState === 'COMPLETION_DUE' ? (
          <PlanEndCard activityType="HIFZ" localRefId={hifz?.id ?? 0} title={hifz?.startSurah?.toString() ?? ''} />
      ) : !!hifz && hifzTodayTask ? (
        <HifzActionCard 
          hifz={hifz!} 
          task={hifzTodayTask} 
          title={hifzTodayTask.displaySurah}
          subTitle={`Target: ${hifzTodayTask.totalTarget} pages • Juz ${hifzTodayTask.juz}`}
          onDetails={onLogHifz}
        />
      ) : !!hifz && (
        <RestDayCardSingle type="hifz" onLog={onLogHifz} />
      )}
      
      {/* Muraja Slot */}
      {murajaState === 'EVALUATION_DUE' ? (
          <EvaluationRequiredCard type="muraja" />
      ) : murajaState === 'COMPLETION_DUE' ? (
          <PlanEndCard activityType="MURAJA" localRefId={weeklyPlan?.id ?? 0} title="Muraja Plan" />
      ) : !!weeklyPlan && todayPlan ? (
        <MurajaActionCard 
          todayPlan={todayPlan} 
          weeklyPlan={weeklyPlan} 
          onDetails={onLogMuraja}
        />
      ) : !!weeklyPlan && (
        <RestDayCardSingle type="muraja" onLog={onLogMuraja} />
      )}
    </View>
  );
};

export const EvaluationRequiredCard = ({ type }: { type: 'hifz' | 'muraja' }) => (
    <Pressable 
        onPress={() => router.push("/evaluation")}
        className="bg-white border border-[#276359]/10 rounded-2xl p-6 shadow-sm overflow-hidden"
    >
        <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-[#276359]/10 rounded-full items-center justify-center">
                    <Ionicons name="lock-closed-outline" size={24} color="#276359" />
                </View>
                <View>
                    <Text className="">{type === 'hifz' ? 'Hifz Review Required' : 'Muraja Review Required'}</Text>
                    <Text className="text-slate-500 text-xs">Finish evaluation to unlock new tasks</Text>
                </View>
            </View>
            <View className="bg-primary px-3 py-1 rounded-full">
                <Text className="text-[10px] text-white  uppercase">Test</Text>
            </View>
        </View>
    </Pressable>
);


export const RestDayCardSingle = ({ type, onLog }: { type: 'hifz' | 'muraja', onLog: () => void }) => (
    <Pressable 
        onPress={onLog}
        className="bg-white border border-[#276359]/10  shadow-sm rounded-2xl p-6 flex-row items-center justify-between"
    >
        <View className="flex-row items-center gap-4">
            <View className={`w-12 h-12 rounded-full items-center justify-center ${type === 'hifz' ? 'bg-primary/5' : 'bg-cyan-50'}`}>
                <Ionicons name="cafe-outline" size={24} color={type === 'hifz' ? '#276359' : '#0891b2'} />
            </View>
            <View>
                <Text className="text-slate-900 ">{type === 'hifz' ? 'Hifz Rest Day' : 'Muraja Rest Day'}</Text>
                <Text className="text-slate-400 text-xs">No tasks for today</Text>
            </View>
        </View>
        <Ionicons name="add-circle" size={24} color="#CBD5E1" />
    </Pressable>
)




