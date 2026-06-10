import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { HifzActionCard } from "./HifzActionCard";
import { MurajaActionCard } from "./MurajaActionCard";
import { CardSkeleton } from "./Skeleton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNavigate } from "@/src/hooks/useNavigate";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";

import { useDashboardState } from "@/src/features/habits/hooks/useDashboardState";

export const TodayTasksSection = ({ 
  onLogHifz, 
  onLogMuraja,
}: { 
  onLogHifz: () => void; 
  onLogMuraja: () => void;
}) => {
  const {
    todayTask: murajaTask,
    loading: murajaLoading,
    weeklyPlan: murajaPlan,
    isRestDay: murajaRestDay,
    refetch: refetchMuraja,
  } = useWeeklyMuraja();

  const {
    hifz: hifzPlan,
    todayTask: hifzTask,
    loading: hifzLoading,
    isRestDay: hifzRestDay,
    hasTodayLog: hifzHasTodayLog,
    refetch: refetchHifz,
  } = useHifzDailyTask();

  const { state: hifzState, isLoading: hifzStateLoading } = useDashboardState(
    'HIFZ', 
    hifzPlan, 
    hifzTask, 
    !!hifzRestDay, 
    hifzLoading, 
    refetchHifz,
    hifzHasTodayLog
  );

  const { state: murajaState, isLoading: murajaStateLoading } = useDashboardState(
    'MURAJA', 
    murajaPlan, 
    murajaTask, 
    !!murajaRestDay, 
    murajaLoading, 
    refetchMuraja
  );

  if (murajaStateLoading || hifzStateLoading) {
    return [1, 2].map((index) => <CardSkeleton key={index} />);
  }

  const hasAnyPlan = !!(hifzPlan || murajaPlan);
  if (!hasAnyPlan) return null;

  return (
    <View className="gap-y-4">
      {/* Hifz Slot */}
      {hifzState.type === 'EVALUATION_DUE' ? (
          <EvaluationRequiredCard type="hifz" />
      ) : hifzState.type === 'PLAN_FINISHED' ? (
          <PlanEndCard activityType="HIFZ" localRefId={hifzPlan?.id ?? 0} title={hifzPlan?.startSurah?.toString() ?? ''} />
      ) : (hifzState.type === 'COMPLETED_TODAY' || hifzState.type === 'PLANNED_DAY' || hifzState.type === 'CATCHUP_DAY') ? (
        <HifzActionCard 
          hifz={hifzPlan!} 
          task={hifzState.task} 
          title={hifzState.task.displaySurah}
          subTitle={`Target: ${hifzState.task.totalTarget} pages · Pages ${hifzState.task.startPage}–${hifzState.task.endPage}`}
          onDetails={onLogHifz}
        />
      ) : hifzState.type === 'REST_DAY' ? (
        <RestDayCardSingle type="hifz" onLog={onLogHifz} />
      ) : null}
      
      {/* Muraja Slot */}
      {murajaState.type === 'EVALUATION_DUE' ? (
          <EvaluationRequiredCard type="muraja" />
      ) : murajaState.type === 'PLAN_FINISHED' ? (
          <PlanEndCard activityType="MURAJA" localRefId={murajaPlan?.id ?? 0} title="Muraja Plan" />
      ) : (murajaState.type === 'COMPLETED_TODAY' || murajaState.type === 'PLANNED_DAY' || murajaState.type === 'CATCHUP_DAY') ? (
        <MurajaActionCard 
          todayPlan={murajaState.task} 
          weeklyPlan={murajaPlan} 
          onDetails={onLogMuraja}
        />
      ) : murajaState.type === 'REST_DAY' ? (
        <RestDayCardSingle type="muraja" onLog={onLogMuraja} />
      ) : null}
    </View>
  );
};

export const EvaluationRequiredCard = ({ type }: { type: 'hifz' | 'muraja' }) => {
  const { push } = useNavigate();
  return (
    <Pressable 
        onPress={() => push("/evaluation")}
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
};


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




