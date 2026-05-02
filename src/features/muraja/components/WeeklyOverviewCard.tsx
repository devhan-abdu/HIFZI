import { IWeeklyMuraja } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { format } from "date-fns";
import { IWeeklyPlanDashboardData } from "../types";

export const WeeklyOverviewCard = ({
  weeklyPlan,
}: {
  weeklyPlan: IWeeklyPlanDashboardData;
}) => {
  const dateRange = `${format(
    new Date(weeklyPlan.week_start_date || new Date()),
    "MMM dd",
  )} - ${format(new Date(weeklyPlan.week_end_date || new Date()), "MMM dd")}`;

  return (
    <View className="bg-primary rounded-[40px] p-7 mb-8 shadow-2xl shadow-primary/40 overflow-hidden relative border border-white/5">
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
      
      <View className="flex-row justify-between items-end mb-6">
        <View className="flex-1">
          <Text className="text-white/50 uppercase tracking-[2px] text-[9px] mb-1.5">
            Active Cycle
          </Text>
          <View className="bg-white/10 px-3 py-1 rounded-full self-start border border-white/10">
            <Text className="text-white text-[10px]  tracking-wider">{dateRange}</Text>
          </View>
        </View>

        <View className="items-end">
           <Text className="text-white/50 uppercase tracking-[2px] text-[9px] mb-1.5">
            Juz Focus
          </Text>
          <Text className="text-white text-2xl tracking-tighter">
            {weeklyPlan.start_juz}—{weeklyPlan.end_juz}
          </Text>
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-white/40 uppercase tracking-widest text-[9px] mb-1">
          Target Progress
        </Text>
        <Text className="text-white text-4xl tracking-tighter">
          {weeklyPlan.totalPage} <Text className="text-white/40 text-xl">Pages</Text>
        </Text>
      </View>

      <View className="w-full h-[2px] bg-white/10 rounded-full mb-8 overflow-hidden" />

      <View className="flex-row justify-between items-center">
        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="calendar-outline"
              size={12}
              color="rgba(255,255,255,0.6)"
            />
            <Text className="text-white text-sm font-medium">{weeklyPlan.totalDays}</Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Days
          </Text>
        </View>

        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="time-outline"
              size={12}
              color="rgba(255,255,255,0.6)"
            />
            <Text className="text-white text-sm font-medium">
              {weeklyPlan.estimated_time_min}m
            </Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Daily
          </Text>
        </View>

        <View className="flex-1 items-center">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="book-outline"
              size={12}
              color="rgba(255,255,255,0.6)"
            />
            <Text className="text-white text-sm font-medium">
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
