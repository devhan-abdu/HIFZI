import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { HifzActionCard } from "./HifzActionCard";
import { MurajaActionCard } from "./MurajaActionCard";
import { CardSkeleton } from "./Skeleton";
import { Ionicons } from "@expo/vector-icons";

export const TodayTasksSection = ({ 
  onLogHifz, 
  onLogMuraja,
  onStartHifz,
  onResumeHifz,
  onStartMuraja,
  onResumeMuraja,
}: { 
  onLogHifz: () => void; 
  onLogMuraja: () => void;
  onStartHifz: (task: any, planId: number) => void;
  onResumeHifz: (task: any, planId: number) => void;
  onStartMuraja: (task: any, planId: number) => void;
  onResumeMuraja: (task: any, planId: number) => void;
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

  if (hasHifzTask || hasMurajaTask) {
    return (
      <View className="gap-y-4">
        {hasHifzTask && hifzTodayTask && (
          <HifzActionCard 
            hifz={hifz!} 
            todayTask={hifzTodayTask} 
            onStart={() => hifz?.id && onStartHifz(hifzTodayTask, hifz.id)}
            onResume={() => hifz?.id && onResumeHifz(hifzTodayTask, hifz.id)}
            onDetails={onLogHifz}
          />
        )}
        {hasMurajaTask && todayPlan && (
          <MurajaActionCard 
            todayPlan={todayPlan} 
            weeklyPlan={weeklyPlan} 
            onStart={() => weeklyPlan?.id && onStartMuraja(todayPlan, weeklyPlan.id)}
            onResume={() => weeklyPlan?.id && onResumeMuraja(todayPlan, weeklyPlan.id)}
            onDetails={onLogMuraja}
          />
        )}
      </View>
    );
  }

  return (
    <RestDayCard 
      onLogHifz={onLogHifz} 
      onLogMuraja={onLogMuraja}
      hasHifzPlan={!!hifz}
      hasMurajaPlan={!!weeklyPlan}
    />
  );
};

const RestDayCard = ({ 
  onLogHifz, 
  onLogMuraja,
  hasHifzPlan,
  hasMurajaPlan
}: { 
  onLogHifz: () => void; 
  onLogMuraja: () => void;
  hasHifzPlan: boolean;
  hasMurajaPlan: boolean;
}) => (
  <View className="bg-white border border-slate-100 rounded-[32px] p-8 items-center shadow-sm">
    <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
      <Ionicons name="cafe-outline" size={32} color="#276359" />
    </View>
    <Text className="text-slate-900 text-lg text-center mb-1">It's a Rest Day!</Text>
    <Text className="text-slate-500 text-sm text-center mb-8 px-4">
      No tasks scheduled for today. Take a well-deserved break or log an extra session to stay ahead.
    </Text>
    
    <View className="flex-row gap-3">
      {hasHifzPlan && (
        <Pressable 
          onPress={onLogHifz} 
          className="flex-1 bg-slate-50 border border-slate-100 py-4 rounded-2xl items-center active:bg-slate-100"
        >
          <Text style={{ color: '#276359' }} className="text-xs  uppercase tracking-widest">Extra Hifz</Text>
        </Pressable>
      )}
      {hasMurajaPlan && (
        <Pressable 
          onPress={onLogMuraja} 
          className="flex-1 bg-slate-50 border border-slate-100 py-4 rounded-2xl items-center active:bg-slate-100"
        >
          <Text style={{ color: '#0891b2' }} className="text-xs  uppercase tracking-widest">Extra Muraja</Text>
        </Pressable>
      )}
    </View>
  </View>
);

