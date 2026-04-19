import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { TodayPlanType } from "../../../types";
import { Text } from "@/src/components/common/ui/Text";

export default function UpcomingSessionCard({
  upcomingSessions,
}: {
  upcomingSessions: TodayPlanType[];
}) {
  const router = useRouter();

  return (
    <View className="flex-col gap-3 px-1">
      {upcomingSessions.map((upcoming) => (
        <Pressable
          key={upcoming.id}
          onPress={() => router.push("/(app)/muraja/(tabs)/log")}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          className="bg-white rounded-xl p-4 border border-gray-300 bg-white shadow-sm"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-2xl bg-slate-50 items-center justify-center">
              <Ionicons name="calendar" size={22} color="#276359" />
            </View>

            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-1">
                <Text className=" text-slate-900 text-base uppercase tracking-tight">
                  {upcoming.day_of_week}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>

              <Text className="text-slate-700   text-sm mb-2" numberOfLines={1}>
                {upcoming.startSurah === upcoming.endSurah ?
                  `Surah ${upcoming.startSurah}`
                : `${upcoming.startSurah} – ${upcoming.endSurah}`}
              </Text>

              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text className="text-slate-500 text-[12px] ">
                    {upcoming.estimated_time_min}m
                  </Text>
                </View>

                <View className="w-1 h-1 rounded-full bg-slate-300" />

                <View className="flex-row items-center gap-1">
                  <Ionicons name="book-outline" size={14} color="#64748b" />
                  <Text className="text-slate-500 text-[12px] ">
                    Pages {upcoming.planned_start_page}–
                    {upcoming.planned_end_page}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
