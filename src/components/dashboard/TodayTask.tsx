import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { HifzActionCard } from "./HifzActionCard";
import { MurajaActionCard } from "./MurajaActionCard";
import { CardSkeleton } from "./Skeleton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { DuePlanInfo } from "@/src/features/habits/services/habitSummaryService";

export const TodayTasksSection = ({ 
  onLogHifz, 
  onLogMuraja,
  onStartHifz,
  onResumeHifz,
  onStartMuraja,
  onResumeMuraja,
  duePlans = [],
}: { 
  onLogHifz: () => void; 
  onLogMuraja: () => void;
  onStartHifz: (task: any, planId: number) => void;
  onResumeHifz: (task: any, planId: number) => void;
  onStartMuraja: (task: any, planId: number) => void;
  onResumeMuraja: (task: any, planId: number) => void;
  duePlans?: DuePlanInfo[];
}) => {
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

  const hasHifzTask = !!(hifz && hifzTodayTask);
  const hasMurajaTask = !!todayPlan;
  const hasAnyPlan = !!(hifz || weeklyPlan);

  if (!hasAnyPlan) return null;
  console.log("duePlans", duePlans, hifz?.id, weeklyPlan?.id);
  const isHifzDue = hifz?.id ? duePlans.some(p => p.activityType === 'HIFZ' && p.localRefId === hifz.id) : false;
  const isMurajaDue = weeklyPlan?.id ? duePlans.some(p => p.activityType === 'MURAJA' && p.localRefId === weeklyPlan.id) : false;

  return (
    <View className="gap-y-4">
      {isHifzDue ? (
          <EvaluationRequiredCard type="hifz" />
      ) : hasHifzTask && hifzTodayTask ? (
        <HifzActionCard 
          hifz={hifz!} 
          task={hifzTodayTask} 
          title={hifzTodayTask.displaySurah}
          subTitle={`Target: ${hifzTodayTask.totalTarget} pages • Juz ${hifzTodayTask.juz}`}
          onStart={() => hifz?.id && onStartHifz(hifzTodayTask, hifz.id)}
          onResume={() => hifz?.id && onResumeHifz(hifzTodayTask, hifz.id)}
          onDetails={onLogHifz}
        />
      ) : !!hifz && (
        <RestDayCardSingle type="hifz" onLog={onLogHifz} />
      )}
      
      {isMurajaDue ? (
          <EvaluationRequiredCard type="muraja" />
      ) : hasMurajaTask && todayPlan ? (
        <MurajaActionCard 
          todayPlan={todayPlan} 
          weeklyPlan={weeklyPlan} 
          onStart={() => weeklyPlan?.id && onStartMuraja(todayPlan, weeklyPlan.id)}
          onResume={() => weeklyPlan?.id && onResumeMuraja(todayPlan, weeklyPlan.id)}
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
                <Text className="text-slate-900 font-semibold">{type === 'hifz' ? 'Hifz Rest Day' : 'Muraja Rest Day'}</Text>
                <Text className="text-slate-400 text-xs">No tasks for today</Text>
            </View>
        </View>
        <Ionicons name="add-circle" size={24} color="#CBD5E1" />
    </Pressable>
)




