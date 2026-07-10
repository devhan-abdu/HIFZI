import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { IHifzPlan } from "../types";
import { getWeeklyStatus } from "../utils/plan-status";
import { useColorScheme } from "nativewind";

export function DayByDay({ plan }: { plan: IHifzPlan }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const data = getWeeklyStatus(plan);
  const week = data?.week;
  if (!week) return null;

  return (
    <View className="flex-row justify-between bg-surface dark:bg-surface-muted p-5 rounded-[24px] border border-border dark:border-white/10">
      {week.map((day) => {
        const isCompleted =
          !!day.log && (day.log.status === "completed" || day.log.status === "partial");
        const isMissed =
          day.log?.status === "missed" || (!day.log && day.isPast && day.isPlanned);
        const isPending = !day.log && day.isPlanned;
        const isRest = !day.isPlanned && !isCompleted;
        const dayIsToday = day.isToday && !isCompleted && !isMissed;
        const baseTone = isDark
          ? "bg-background/40 border-white/10"
          : "bg-background border-border";

        return (
          <View key={day.name} className="items-center">
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
                <Ionicons
                  name="cafe-outline"
                  size={14}
                  color={isDark ? "#cbd5e1" : "#9ca3af"}
                />
              ) : (
                <Text className="text-primary text-[10px]">{day.name[0]}</Text>
              )}
            </View>
            <Text className={`text-[10px] ${day.isToday ? "text-primary" : "text-muted"}`}>
              {day.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}