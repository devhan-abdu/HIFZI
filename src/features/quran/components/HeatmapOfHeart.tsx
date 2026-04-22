import React from "react";
import { View, ScrollView, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { PerformanceService } from "@/src/services/PerformanceService";

const TOTAL_PAGES = 604;
const COLUMN_COUNT = 20;

export const HeatmapOfHeart = () => {
  const db = useSQLiteContext();
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["page-performance-all"],
    queryFn: async () => {
      const rows = await db.getAllAsync<{ page_number: number; strength: number }>(
        "SELECT page_number, strength FROM page_performance"
      );
      const map = new Map<number, number>();
      rows.forEach((r) => map.set(r.page_number, r.strength));
      return map;
    },
  });

  if (isLoading) return <View className="h-40 items-center justify-center"><Text>Loading Heatmap...</Text></View>;

  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  const getColor = (strength: number | undefined) => {
    if (strength === undefined || strength === 0) return "#f1f5f9"; // Slate 100 (Empty/New)
    if (strength < 0.3) return "#fee2e2"; // Red 100 (Weak)
    if (strength < 0.6) return "#fef08a"; // Yellow 100 (Medium)
    if (strength < 0.9) return "#dcfce7"; // Green 100 (Strong)
    return "#22c55e"; // Green 500 (Mastered)
  };

  const getBorderColor = (strength: number | undefined) => {
    if (strength === undefined || strength === 0) return "#e2e8f0";
    if (strength < 0.3) return "#ef4444";
    if (strength < 0.6) return "#eab308";
    if (strength < 0.9) return "#4ade80";
    return "#15803d";
  };

  return (
    <View className="bg-white rounded-3xl p-5 border border-slate-100">
      <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-4">
        Heatmap of the Heart
      </Text>
      
      <View className="flex-row flex-wrap gap-1 justify-center">
        {pages.map((page) => {
          const strength = performanceData?.get(page);
          return (
            <View
              key={page}
              style={{
                width: 6,
                height: 6,
                backgroundColor: getColor(strength),
                borderRadius: 1,
                borderWidth: strength && strength > 0 ? 0.5 : 0,
                borderColor: getBorderColor(strength),
              }}
            />
          );
        })}
      </View>
      
      <View className="mt-4 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className="w-2 h-2 bg-slate-100 rounded-sm mr-1" />
          <Text className="text-[10px] text-slate-400">New</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 bg-red-100 rounded-sm mr-1" />
          <Text className="text-[10px] text-slate-400">Weak</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 bg-yellow-100 rounded-sm mr-1" />
          <Text className="text-[10px] text-slate-400">Medium</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 bg-green-500 rounded-sm mr-1" />
          <Text className="text-[10px] text-slate-400">Mastered</Text>
        </View>
      </View>
    </View>
  );
};
