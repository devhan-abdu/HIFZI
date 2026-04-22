import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { LinearGradient } from "expo-linear-gradient";

export const NextBestAction = () => {
  const router = useRouter();
  const { todayTask: murajaTask, loading: murajaLoading } = useWeeklyMuraja();
  const { todayTask: hifzTask, loading: hifzLoading } = useHifzDailyTask();

  if (murajaLoading || hifzLoading) return null;

  // Determine the primary action
  // Priority: Hifz (New learning) > Muraja (Revision)
  let primaryAction = null;

  if (hifzTask && hifzTask.status !== "completed") {
    primaryAction = {
      type: "HIFZ",
      title: "Continue Hifz",
      description: `Surah ${hifzTask.displaySurah} · Page ${hifzTask.startPage}`,
      targetPage: hifzTask.startPage,
      color: ["#276359", "#1d4d45"],
      icon: "ribbon",
    };
  } else if (murajaTask && murajaTask.status !== "completed") {
    primaryAction = {
      type: "MURAJA",
      title: "Start Revision",
      description: `Muraja Session · Page ${murajaTask.startPage}`,
      targetPage: murajaTask.startPage,
      color: ["#0891b2", "#0e7490"],
      icon: "sync",
    };
  }

  if (!primaryAction) {
    return (
      <View className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center">
          <Ionicons name="checkmark" size={20} color="#fff" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-emerald-900 font-bold">Today's Goals Met!</Text>
          <Text className="text-emerald-700 text-xs">You've completed your assigned tasks.</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable 
      onPress={() => router.push(`/quran/reader?page=${primaryAction.targetPage}`)}
      className="overflow-hidden rounded-3xl shadow-xl shadow-teal-900/20"
    >
      <LinearGradient
        colors={primaryAction.color as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <View className="bg-white/20 self-start px-2 py-0.5 rounded-full mb-2">
              <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                Recommended Action
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold mb-1">
              {primaryAction.title}
            </Text>
            <Text className="text-white/80 text-sm">
              {primaryAction.description}
            </Text>
          </View>
          <View className="w-14 h-14 rounded-2xl bg-white/10 items-center justify-center">
            <Ionicons name={primaryAction.icon as any} size={30} color="#fff" />
          </View>
        </View>
        
        <View className="mt-4 flex-row items-center">
          <Text className="text-white font-semibold mr-2">Open Mushaf</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
};
