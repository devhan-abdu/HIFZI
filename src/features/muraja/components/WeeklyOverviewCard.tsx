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
    new Date(weeklyPlan.week_start_date),
    "MMM dd",
  )} - ${format(new Date(weeklyPlan.week_end_date), "MMM dd")}`;

  return (
    <View className="bg-primary rounded-[32px] p-6 mb-6 shadow-xl shadow-primary/20 overflow-hidden border border-white/10 relative">
      <View className="mb-6">
        <Text className="text-white/50  uppercase tracking-[2px] text-[9px] mb-1.5">
          Active Cycle
        </Text>
        <View className="bg-white/15 px-3 py-1 rounded-full self-start border border-white/5">
          <Text className="text-white text-[10px]  ">{dateRange}</Text>
        </View>
      </View>
      <View className="absolute -top-4 -right-4 bg-slate-100/10 w-28 h-28 rounded-full" />

      <View className="flex-row items-center mb-2">
        <View className="flex-1">
          <Text className="text-white/50  uppercase tracking-widest text-[9px] mb-1">
            Total Pages
          </Text>
          <Text className="text-white text-4xl  tracking-tighter">
            {weeklyPlan.totalPage}
          </Text>
        </View>

        <View className="h-10 w-[1px] bg-white/10 mx-4" />

        <View className="flex-1">
          <Text className="text-white/50  uppercase tracking-widest text-[9px] mb-1">
            Juz Focus
          </Text>
          <Text className="text-white text-2xl  tracking-tight">
            {weeklyPlan.start_juz}—{weeklyPlan.end_juz}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center border-t border-white/10 pt-5 mt-2">
        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="calendar-outline"
              size={12}
              color="rgba(255,255,255,0.6)"
            />
            <Text className="text-white  text-sm">{weeklyPlan.totalDays}</Text>
          </View>
          <Text className="text-white/40 text-[8px]  uppercase tracking-[1.5px]">
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
            <Text className="text-white  text-sm">
              {weeklyPlan.estimated_time_min}m
            </Text>
          </View>
          <Text className="text-white/40 text-[8px]  uppercase tracking-[1.5px]">
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
            <Text className="text-white  text-sm">
              {weeklyPlan.planned_pages_per_day}
            </Text>
          </View>
          <Text className="text-white/40 text-[8px]  uppercase tracking-[1.5px]">
            Pages
          </Text>
        </View>
      </View>
    </View>
  );
};
