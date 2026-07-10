import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { IMurajaDayStatus } from "../types";
import { useColorScheme } from "nativewind";

export function DayByDay({ progress }: { progress: IMurajaDayStatus[] | null}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!progress) return null;

  return (
    <View className="flex-row justify-between bg-surface dark:bg-surface-muted p-5 rounded-[24px] border border-border dark:border-white/10">
      {progress.map((day) => {

        const isCompleted = day.status === "completed";
        const isMissed = day.status === "missed";
        const isRest = day.status === "rest";
        const isPending = day.status === "pending" || day.status === "future";
        const dayIsToday = day.isToday && !isCompleted && !isMissed;
        const baseTone = isDark ? "bg-background/40 border-white/10" : "bg-background border-border";

        return (
          <View key={day.date} className="items-center">
            <View
              className={`w-9 h-9 rounded-full items-center justify-center mb-2 
                ${dayIsToday ? "border-2 border-primary border-dashed" : ""}
                ${isCompleted ? "bg-primary border border-primary" : ""}
                ${isMissed ? "bg-rose-500/10 border border-rose-500/20" : ""}
                ${isRest ? "bg-surface dark:bg-surface-muted border border-border dark:border-white/10" : ""}
                ${isPending ? `${baseTone} border` : ""}
              `}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : isMissed ? (
                <Ionicons name="close" size={14} color="#f87171" />
              ) : isRest ? (
                <Ionicons name="cafe-outline" size={14} color={isDark ? "#cbd5e1" : "#9ca3af"} />
              ) : (
                <Text className="text-primary text-[10px]">
                  {day.dayName[0]}
                </Text>
              )}
            </View>

            <Text
              className={`text-[10px] ${day.isToday ? "text-primary " : "text-muted"}`}
            >
              {day.dayName}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
