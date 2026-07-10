import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { getPerformance } from "@/src/features/hifz/utils/plan-calculations";

type Props = {
  startSurah: string;
  endSurah: string;
  targetEndDate: string;
  totalPages: number;
  completedPages: number;
  progress: number;
  remainingPages: number;
  currentSurah: string;
  currentPage: number;
  planEndPage: number;
  pagesPerDay: number;
  daysPerWeek: number;
  paceDelta: number;
};

export function HifzPlanOverviewCard({
  startSurah,
  endSurah,
  totalPages,
  completedPages,
  progress,
  remainingPages,
  currentSurah,
  pagesPerDay,
  daysPerWeek,
  paceDelta,
}: Props) {
  const pace = getPerformance(paceDelta);
   const paceLabel =
     pace.label === "ahead" ? "Ahead"
     : pace.label === "behind" ? "Behind"
     : "On Track";
   const paceIcon =
     pace.label === "ahead" ? "trending-up"
     : pace.label === "behind" ? "trending-down"
     : "remove";
   const paceBg =
     pace.label === "ahead" ? "bg-emerald-500/20"
     : pace.label === "behind" ? "bg-amber-500/20"
     : "bg-blue-500/20";


  return (
    <View className="bg-primary rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative border border-white/5">
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />

      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 pr-3">
          <Text className="text-white/50 uppercase tracking-[2px] text-[9px] mb-1.5">
            Plan range
          </Text>
          <View className="bg-surface/10 px-3 py-1 rounded-full self-start border border-white/10">
            <Text className="text-white text-[10px] tracking-wider">
              {startSurah} – {endSurah}
            </Text>
          </View>
        </View>

        <View
          className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-full ${paceBg} border border-white/10`}
        >
          <Ionicons
            name={paceIcon as any}
            size={11}
            color="rgba(255,255,255,0.8)"
          />
          <Text className="text-white/80 text-[9px] uppercase tracking-wider">
            {paceLabel}
          </Text>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-white/40 uppercase tracking-widest text-[9px] mb-1">
          Memorized in this plan
        </Text>
        <Text className="text-white text-4xl tracking-tighter">
          {completedPages}{" "}
          <Text className="text-white/40 text-xl">/ {totalPages} pages</Text>
        </Text>
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-white/40 text-[9px] uppercase tracking-widest">
            Progress
          </Text>
          <Text className="text-white/70 text-[9px]">
            {Math.round(progress)}%
          </Text>
        </View>
        <View className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </View>
      </View>

      <View className="w-full h-[1px] bg-surface/10 rounded-full mb-6" />

      {/* Stats row */}
      <View className="flex-row justify-between items-center">
        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="calendar-outline"
              size={12}
              color="rgba(255,255,255,0.6)"
            />
            <Text className="text-white text-sm">{daysPerWeek}</Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Days/wk
          </Text>
        </View>

        <View className="flex-1 items-center border-r border-white/10">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons
              name="book-outline"
              size={12}
              color="rgba(255,255,255,0.6)"
            />
            <Text className="text-white text-sm">{pagesPerDay}</Text>
          </View>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px]">
            Pages/day
          </Text>
        </View>

        <View className="flex-1 items-center">
          <Text className="text-white text-sm">{remainingPages}</Text>
          <Text className="text-white/40 text-[8px] uppercase tracking-[1.5px] mt-0.5">
            Pages left
          </Text>
        </View>
      </View>
    </View>
  );
}
