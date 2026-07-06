import React from "react";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

interface LogStudyHeroProps {
  startSurahName: string;
  endSurahName: string;
  startPage: number;
  effectiveEndPage: number;
  heroPages: number;
  isRestDay: boolean;
  showCustomRange: boolean;
  pages: number;
}

export function LogStudyHero({
  startSurahName,
  endSurahName,
  startPage,
  effectiveEndPage,
  heroPages,
  isRestDay,
  showCustomRange,
  pages,
}: LogStudyHeroProps) {
  return (
    <View className="bg-primary rounded-3xl p-6 mb-8 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <View className="bg-surface/10 px-2.5 py-1 rounded-lg border border-white/10">
          <Text className="text-white text-[10px] uppercase tracking-[2px]">
            {isRestDay ? "Next Plan" : "Study Target"}
          </Text>
        </View>
        <Text className="text-white/60 text-[10px] uppercase tracking-widest">
          Muraja
        </Text>
      </View>
      <View className="flex-row items-end justify-between">
        <View className="flex-1">
          <Text className="text-white text-2xl tracking-tighter">
            {startSurahName === endSurahName ?
              startSurahName
            : `${startSurahName} – ${endSurahName}`}
          </Text>
          <Text className="text-white/50 text-xs mt-1">
            {isRestDay ?
              `Next session: ${pages > 0 ? `Pages ${startPage}–${effectiveEndPage}` : `Page ${startPage}`}`
            : pages > 0 ?
              `Pages ${startPage}–${effectiveEndPage}`
            : `Page ${startPage}`}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-baseline">
            <Text className="text-white text-2xl tracking-tighter">
              {heroPages}
            </Text>
            <Text className="text-white/40 text-sm ml-1">Pgs</Text>
          </View>
          <Text className="text-white/40 text-[9px] uppercase tracking-widest">
            {showCustomRange ? "Custom Range" : "Target Volume"}
          </Text>
        </View>
      </View>
    </View>
  );
}
