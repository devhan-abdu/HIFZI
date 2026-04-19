import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { IHifzPlan } from "../types";
import { getWeeklyStatus } from "../utils/plan-status";

export function DayByDay({ plan }: { plan: IHifzPlan }) {
  const data = getWeeklyStatus(plan);

  const week = data?.week
  if(!week) return 
  return (
    <View className="flex-row justify-between bg-white p-5 rounded-[32px] border border-gray-100">
      {week.map((day) => {
        const isCompleted = !!day.log && day.log.status === "completed";

        const isMissed =
          day.log?.status === "missed" ||
          (!day.log && day.isPast && day.isPlanned);

        const isPending = !day.log && day.isToday && day.isPlanned;

        return (
          <View key={day.name} className="items-center">
            <View
              className={`w-9 h-9 rounded-full items-center justify-center mb-2 
             ${isCompleted ? "bg-primary" : "bg-gray-100"}
            ${isMissed ? "bg-red-50" : ""}
            ${isPending ? "border-2 border-primary border-dashed bg-white" : ""}
          `}
            >
              {isCompleted ?
                <Ionicons name="checkmark" size={16} color="white" />
              : isMissed ?
                <Ionicons name="close" size={14} color="#f87171" />
              : <Text className="text-gray-400 text-[10px]">{day.name[0]}</Text>
              }
            </View>

            <Text
              className={`text-[10px]   ${
                day.isToday ? "text-primary" : "text-gray-400"
              }`}
            >
              {day.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
