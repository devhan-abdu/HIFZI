import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { IHifzPlan } from "../types";
import { getWeeklyStatus } from "../utils/plan-status";

export function DayByDay({ plan }: { plan: IHifzPlan }) {
  const data = getWeeklyStatus(plan);

  const week = data?.week;
  if (!week) return null;

  return (
    <View className="flex-row justify-between bg-white p-5 rounded-[32px] border border-gray-100">
      {week.map((day) => {
        const isCompleted = !!day.log && (day.log.status === "completed" || day.log.status === "partial");

        const isMissed =
          day.log?.status === "missed" ||
          (!day.log && day.isPast && day.isPlanned);

        const isPending = !day.log && day.isPlanned;
        const isRest = !day.isPlanned && !isCompleted;

        return (
          <View key={day.name} className="items-center">
            <View
              className={`w-9 h-9 rounded-full items-center justify-center mb-2 
                ${day.isToday ? "border-2 border-primary border-dashed" : ""}
                ${isCompleted ? (day.isToday ? "bg-primary/10" : "bg-primary") : ""}
                ${isMissed ? "bg-red-50" : ""}
                ${!day.isToday && isMissed ? "border border-red-100" : ""}
                ${isRest ? "bg-gray-50" : ""}
                ${!day.isToday && isRest ? "border border-gray-200" : ""}
                ${isPending ? "bg-primary/5" : ""}
                ${!day.isToday && isPending ? "border border-gray-200" : ""}
              `}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color={day.isToday ? "#276359" : "white"} />
              ) : isMissed ? (
                <Ionicons name="close" size={14} color="#f87171" />
              ) : isRest ? (
                <Ionicons name="cafe-outline" size={14} color="#9ca3af" />
              ) : (
                <Text className="text-primary text-[10px]">
                  {day.name[0]}
                </Text>
              )}
            </View>

            <Text
              className={`text-[10px] ${
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
