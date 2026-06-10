import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { IMurajaDayStatus } from "../types";

export function DayByDay({ progress }: { progress: IMurajaDayStatus[] | null}) {

  if (!progress) return null;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <View className="flex-row justify-between bg-white p-5 rounded-[32px] border border-gray-100">
      {progress.map((day) => {

        const isCompleted = day.status === "completed";
        const isMissed = day.status === "missed";
        const isRest = day.status === "rest";
        const isPending = day.status === "pending" || day.status === "future"; // both pending and future get the standard pending styling

        return (
          <View key={day.date} className="items-center">
            <View
              className={`w-9 h-9 rounded-full items-center justify-center mb-2 
                ${day.isToday && !isCompleted && !isMissed ? "border-2 border-primary border-dashed" : ""}
                ${isCompleted ? "bg-primary" : ""}
                ${isMissed ? "bg-red-50 border border-red-100" : ""}
                ${isRest ? "bg-gray-50 border border-gray-200" : ""}
                ${isPending ? "bg-primary/5 border border-gray-200" : ""}
              `}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : isMissed ? (
                <Ionicons name="close" size={14} color="#f87171" />
              ) : isRest ? (
                <Ionicons name="cafe-outline" size={14} color="#9ca3af" />
              ) : (
                <Text className="text-primary text-[10px]">
                  {day.dayName[0]}
                </Text>
              )}
            </View>

            <Text
              className={`text-[10px] ${day.isToday ? "text-primary " : "text-gray-400"}`}
            >
              {day.dayName}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
