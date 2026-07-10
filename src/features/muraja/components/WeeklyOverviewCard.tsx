import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { IWeeklyPlanDashboardData } from "../types";

export const WeeklyOverviewCard = ({
  weeklyPlan,
  stats,
}: {
  weeklyPlan: IWeeklyPlanDashboardData;
  stats?: {
    overAllProgress: string;
    totalCompletedPages: number;
    totalRangePages: number;
    performanceStatus: 'ahead' | 'behind' | 'on-track';
    accuracy: number;
  } | null;
}) => {
  const progressPct = parseFloat(stats?.overAllProgress ?? "0");
  const completed = stats?.totalCompletedPages ?? 0;
  const total = stats?.totalRangePages ?? (weeklyPlan.weeklyTargetPages ?? 0);
  const perf = stats?.performanceStatus ?? 'on-track';

  const paceLabel = perf === 'ahead' ? 'Ahead' : perf === 'behind' ? 'Behind' : 'On Track';
  const paceIcon = perf === 'ahead' ? 'trending-up' : perf === 'behind' ? 'trending-down' : 'remove';
  const paceBg = perf === 'ahead' ? 'bg-emerald-500/20' : perf === 'behind' ? 'bg-amber-500/20' : 'bg-blue-500/20';

  return (
    <View className="bg-primary rounded-[40px] p-7 mb-8 shadow-2xl shadow-primary/40 overflow-hidden relative border border-white/5">
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />

      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 pr-3">
          <Text className="text-white/50 uppercase tracking-[2px] text-[9px] mb-1.5">
            Plan Range
          </Text>
          <View className="bg-surface/10 px-3 py-1 rounded-full self-start border border-white/10">
            <Text className="text-white text-[10px] tracking-wider">
              {weeklyPlan.startSurah} – {weeklyPlan.endSurah}
            </Text>
          </View>
        </View>

        <View className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-full ${paceBg} border border-white/10`}>
          <Ionicons name={paceIcon as any} size={11} color="rgba(255,255,255,0.8)" />
          <Text className="text-white/80 text-[9px] uppercase tracking-wider">{paceLabel}</Text>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-white/40 uppercase tracking-widest text-[9px] mb-1">
          Reviewed in this cycle
        </Text>
        <Text className="text-white text-4xl tracking-tighter">
          {completed}{" "}
          <Text className="text-white/40 text-xl">/ {total} pages</Text>
        </Text>
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-white/40 text-[9px] uppercase tracking-widest">Progress</Text>
          <Text className="text-white/70 text-[9px]">{progressPct.toFixed(0)}%</Text>
        </View>
        <View className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </View>
      </View>

      <View className="w-full h-[1px] bg-surface/10 rounded-full mb-6" />

      <View className="flex-row justify-between items-center">
        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text className="text-white text-sm">{weeklyPlan.totalDays}</Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Days/Wk
          </Text>
        </View>

        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text className="text-white text-sm">
              {weeklyPlan.estimated_time_min}m
            </Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Daily
          </Text>
        </View>

        <View className="flex-1 items-center">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="book-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text className="text-white text-sm">
              {weeklyPlan.planned_pages_per_day}
            </Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Rate
          </Text>
        </View>
      </View>
    </View>
  );
};
