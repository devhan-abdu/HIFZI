import React from "react";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

type Props = {
  hasReviewPrefill: boolean;
  logContext: any;
  isRestDay: boolean;
  heroSurahLabel: string;
  heroRangeLabel: string;
  heroPageCount: number;
};

export function HeroCard({
  hasReviewPrefill,
  logContext,
  isRestDay,
  heroSurahLabel,
  heroRangeLabel,
  heroPageCount,
}: Props) {
  return (
    <View className="bg-primary rounded-3xl p-6 mb-8 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <View className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
          <Text className="text-white text-[10px] uppercase tracking-[2px]">
            {hasReviewPrefill ?
              "Revision Session"
            : logContext?.isNextPlannedDay ?
              "Next Plan"
            : isRestDay ?
              "Next Plan"
            : logContext?.isPlannedDay ?
              "Study Target"
            : "Extra"}
          </Text>
        </View>

        <Text className="text-white/60 text-[10px] uppercase tracking-widest">
          Hifz
        </Text>
      </View>

      <View className="flex-row items-end justify-between">
        <View className="flex-1">
          <Text className="text-white text-2xl tracking-tighter">
            {heroSurahLabel}
          </Text>

          <Text className="text-white/50 text-xs mt-1">
            {isRestDay && logContext ?
              `Next session: ${heroRangeLabel}`
            : `Range: ${heroRangeLabel}`}
          </Text>
        </View>

        <View className="items-end">
          <View className="flex-row items-baseline">
            <Text className="text-white text-2xl tracking-tighter">
              {heroPageCount}
            </Text>

            <Text className="text-white/40 text-sm ml-1">Pgs</Text>
          </View>

          <Text className="text-white/40 text-[9px] uppercase tracking-widest">
            Target Volume
          </Text>
        </View>
      </View>
    </View>
  );
}
