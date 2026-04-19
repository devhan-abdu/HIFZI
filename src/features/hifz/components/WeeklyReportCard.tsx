import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type WeeklyReport = {
  rate: number;
  weekRange: string;
  completed: number;
  partial: number;
  missed: number;
};
export const WeeklyReportCard = ({
  rate,
  weekRange,
  completed,
  partial,
  missed,
}: WeeklyReport) => {
  return (
    <View className="bg-primary rounded-[32px] mb-8 overflow-hidden shadow-xl shadow-primary/20 border border-white/10">
      <View className="bg-white/10 px-6 py-3 flex-row items-center justify-between border-b border-white/5">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="calendar-outline"
            size={14}
            color="rgba(255,255,255,0.6)"
          />
          <Text className="text-white/80 text-[11px]  uppercase tracking-[1px]">
            {weekRange}
          </Text>
        </View>
      </View>

      <View className="p-6">
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text className="text-white/50  uppercase tracking-[2px] text-[9px] mb-1">
              Weekly Performance
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-white text-5xl  tracking-tighter">
                {Math.round(rate)}
              </Text>
              <Text className="text-white/60 text-xl   ml-1">%</Text>
            </View>
          </View>

          <View className="bg-white/15 p-4 rounded-[24px] border border-white/10">
            <Ionicons
              name={rate >= 80 ? "trophy" : "ribbon-outline"}
              size={32}
              color="white"
            />
          </View>
        </View>

        <View className="flex-row items-center border-t border-white/10 pt-5">
          <View className="flex-1 items-center border-r border-white/10">
            <Text className="text-white text-xl ">{completed}</Text>
            <Text className="text-white/40 text-xs  uppercase tracking-widest">
              Done
            </Text>
          </View>

          <View className="flex-1 items-center border-r border-white/10">
            <Text className="text-white text-xl ">{partial}</Text>
            <Text className="text-white/40 text-xs  uppercase tracking-widest">
              Partial
            </Text>
          </View>

          <View className="flex-1 items-center">
            <Text className="text-white text-xl ">{missed}</Text>
            <Text className="text-white/40 text-xs  uppercase tracking-widest">
              Missed
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
