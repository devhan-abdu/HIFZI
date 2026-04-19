import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { IWeeklyMuraja } from "@/src/types";
import { formatWeekRange } from "../utils/dateHelpers";

export default function WeeklyReviewCard({
  weekHistory,
}: {
  weekHistory: IWeeklyMuraja[];
}) {
  const router = useRouter();

  const handlePress = (id: number) => {
    router.push({
      pathname: "/muraja/[review]",
      params: {
        review: id,
      },
    });
  };

  return (
    <View className="flex-col gap-3">
      {weekHistory.map((week) => {
        const id = week.id;
        const weekRange = formatWeekRange(
          week.week_start_date,
          week.week_end_date,
        );

        return (
          <Pressable
            key={id}
            onPress={() => handlePress(id)}
            className="bg-white rounded-xl p-4 border border-gray-300 bg-white shadow-sm"
          >
            <View className="flex-row justify-between items-center gap-2">
              <Ionicons
                name="calendar-outline"
                size={20}
                className="p-3 rounded-full bg-green-100"
                color={"#0b6623"}
              />

              <View className="flex-1">
                <Text className="  text-gray-800 text-lg">{weekRange}</Text>
                <View className="flex-col items-start gap-2 mt-1 ">
                  <Text className="text-gray-900 mr-2">
                    {week.start_surah === week.end_surah ?
                      week.start_surah
                    : `${week.start_surah} – ${week.end_surah}`}
                  </Text>
                  <View className="flex-row items-center gap-4 flex-1 mt-4">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={18} color="#4B5563" />
                      <Text className="text-gray-600 text-sm">
                        {week.estimated_time_min} min
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2 ">
                      <Ionicons
                        name="layers-outline"
                        size={16}
                        color="#4b5563"
                      />
                      <Text className="text-sm text-gray-700 ">
                        {week.planned_pages} pages
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
