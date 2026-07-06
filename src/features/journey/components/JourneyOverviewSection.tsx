import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import type { JourneyOverview } from "../types";
import { JOURNEY_CONSTANTS } from "../utils/journeyComputations";

export function JourneyOverviewSection({ overview }: { overview: JourneyOverview }) {
  const startLabel = overview.journeyStartDate
    ? new Date(overview.journeyStartDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not started";

  return (
    <View className="bg-primary rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative border border-white/5">
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-surface/5 rounded-full" />

      <View className="flex-row justify-between items-end mb-6">
        <View className="flex-1">
          <Text className="text-white/50 uppercase tracking-[2px] text-[9px] mb-1.5">
            Hifz memorization
          </Text>
          <View className="bg-surface/10 px-3 py-1 rounded-full self-start border border-white/10">
            <Text className="text-white text-[10px] tracking-wider">
              {overview.uniquePagesMemorized} unique pages
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-white/50 uppercase tracking-[2px] text-[9px] mb-1.5">
            Journey started
          </Text>
          <Text className="text-white text-lg tracking-tight">{startLabel}</Text>
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-white/40 uppercase tracking-widest text-[9px] mb-1">
          Quran completed (by pages)
        </Text>
        <Text className="text-white text-4xl tracking-tighter">
          {overview.quranPercent}
          <Text className="text-white/40 text-xl">%</Text>
        </Text>
        <Text className="text-white/50 text-xs mt-1">
          {overview.juzMemorized} juz with memorized pages ·{" "}
          {overview.uniquePagesMemorized} / {JOURNEY_CONSTANTS.TOTAL_QURAN_PAGES} pages
        </Text>
      </View>

      <View className="w-full h-[2px] bg-surface/10 rounded-full mb-6 overflow-hidden">
        <View
          className="h-full bg-surface rounded-full"
          style={{ width: `${overview.quranPercent}%` }}
        />
      </View>

      <View className="flex-row justify-between items-center">
        <HeroMetric
          icon="calendar-outline"
          value={String(overview.totalDaysActive)}
          label="Days active"
        />
        <HeroMetric
          icon="layers-outline"
          value={String(overview.totalPlans)}
          label="Plans"
        />
        <HeroMetric
          icon="flame-outline"
          value={String(overview.currentStreak)}
          label="Streak"
          isLast
        />
      </View>
    </View>
  );
}

function HeroMetric({
  icon,
  value,
  label,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-1 items-center ${isLast ? "" : "border-r border-white/10"}`}
    >
      <View className="flex-row items-center gap-1.5 mb-1">
        <Ionicons name={icon} size={12} color="rgba(255,255,255,0.6)" />
        <Text className="text-white text-sm">{value}</Text>
      </View>
      <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
        {label}
      </Text>
    </View>
  );
}
