import { Button } from "@/src/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

interface TodayMurajaCardProps {
  todayPlan: any;
  onStatusUpdate: (status: "completed" | "pending" ) => void;
  isUpdating: boolean;
}

export const TodayMurajaCard = ({
  todayPlan,
  onStatusUpdate,
  isUpdating,
}: TodayMurajaCardProps) => {
  const router = useRouter();

  const isDisabled = isUpdating || todayPlan.status !== "pending";

  return (
    <View className="bg-white rounded-xl  border border-gray-300 shadow-sm">
      <View className="p-6">
        <View className="flex-row justify-between items-center mb-6 ">
          <View>
            <Text className="text-xl  text-gray-900">
              {todayPlan.startSurah === todayPlan.endSurah ?
                todayPlan.startSurah
              : `${todayPlan.startSurah} – ${todayPlan.endSurah}`}
            </Text>
            <Text className="text-sm uppercase tracking-wide text-gray-700 mt-1">
              Pages {todayPlan.startPage}–{todayPlan.endPage}
            </Text>
          </View>
          <Ionicons name="book-outline" size={24} color="#276359" />
        </View>

        <View className="border-t border-slate-100 pt-6 mt-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[10px]  uppercase tracking-[2px] text-slate-400">
              Status
            </Text>
            <Pressable
              onPress={() => router.push(`/(app)/muraja/(tabs)/log`)}
              className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full active:bg-slate-100"
            >
              <Text className="text-primary   text-[11px] mr-1.5">Add Log</Text>
              <Ionicons name="chevron-forward" size={12} color="#276359" />
            </Pressable>
          </View>

          <View className="flex-row justify-between gap-2">
            <ActionButton
              label="Done"
              icon="checkmark-circle"
              colorClass="bg-primary border-emerald-600"
              onPress={() => onStatusUpdate("completed")}
              isActive={todayPlan.status === "completed"}
              loading={isUpdating}
              disabled={isDisabled}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const ActionButton = ({
  label,
  icon,
  colorClass,
  onPress,
  loading,
  disabled,
  isActive,
}: any) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-2xl border 
        ${isActive ? colorClass : "bg-white border-slate-100"} 
        ${disabled ? "opacity-40" : "active:scale-[0.96] shadow-sm"}`}
    >
      {loading ?
        <ActivityIndicator size="small" color="#64748b" />
      : <>
          <Ionicons
            name={icon}
            size={16}
            color={isActive ? "white" : "#64748b"}
          />
          <Text
            className={`text-[11px]  uppercase tracking-wider 
            ${isActive ? "text-white" : "text-slate-500"}`}
          >
            {label}
          </Text>
        </>
      }
    </Pressable>
  );
};
