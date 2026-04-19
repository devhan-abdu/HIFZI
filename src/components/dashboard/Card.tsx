import { ISurah } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

type HifzAnalytics = {
  progress?: number;
  currentSurah?: string;
  currentPage?: number;
  endPage?: number;
  targetEndDate?: string;
  todayTarget?: number;
};

type MurajaPlan = {
  week_start_date?: string;
  week_end_date?: string;
  start_juz?: number;
  end_juz?: number;
  planned_pages_per_day?: number;
  estimated_time_min?: number;
};

type Cardprops = {
  hifzAnalytics?: HifzAnalytics | null;
  murajaPlan?: MurajaPlan | null;
  habitProgress: {
    progressByType: {
      HIFZ: { units: number; sessions: number };
      MURAJA: { units: number; sessions: number };
      NORMAL_READING: { units: number; sessions: number };
    };
    analytics: { longestStreak: number };
  };
  surah: ISurah[];
};

function safeFormat(date?: string) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return format(d, "MMM dd");
}

export default function Card({
  hifzAnalytics,
  habitProgress,
  murajaPlan,
}: Cardprops) {
  // 🚫 If nothing exists, render nothing
  if (!murajaPlan && !hifzAnalytics) return null;

  // ✅ Safe date range
  const dateRange =
    (
      murajaPlan &&
      (safeFormat(murajaPlan.week_start_date) ||
        safeFormat(murajaPlan.week_end_date))
    ) ?
      `${safeFormat(murajaPlan.week_start_date)} - ${safeFormat(
        murajaPlan.week_end_date,
      )}`
    : "";

  return (
    <View className="bg-primary rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative">
      {/* Background bubble */}
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />

      {/* Header */}
      <View className="flex-row justify-between items-end mb-6">
        <View>
          <Text className="text-white/60 uppercase tracking-[2px] text-[10px] mb-1">
            {format(new Date(), "EEEE, MMM dd")}
          </Text>
          <Text className="text-white text-3xl tracking-tighter">
            Hifz <Text className="text-white/50">&</Text> Muraja
          </Text>
        </View>

        {hifzAnalytics && (
          <View className="items-end">
            <Text className="text-white/60 uppercase text-[8px] mb-1 tracking-widest">
              Hifz Progress
            </Text>
            <View className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Text className="text-white text-[11px]">
                {hifzAnalytics.progress ?? 0}%
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="w-full h-[2px] bg-white/10 rounded-full mb-9 overflow-hidden" />

      <View className="flex-row">
        {/* HIFZ */}
        {hifzAnalytics && (
          <View className="flex-1 pr-5 border-r border-white/10">
            <View className="flex-row items-center mb-4">
              <Ionicons
                name="book-outline"
                size={13}
                color="rgba(255,255,255,0.7)"
              />
              <Text className="text-white/50 text-[9px] uppercase tracking-widest ml-2">
                Current Hifz
              </Text>
            </View>

            <Text
              className="text-white text-2xl tracking-tight leading-7"
              numberOfLines={1}
            >
              {hifzAnalytics.currentSurah ?? "-"}
            </Text>

            <Text className="text-white/80 text-[11px] mt-1">
              Page {hifzAnalytics.currentPage ?? "-"}
              <Text className="text-white/40">
                {" "}
                of {hifzAnalytics.endPage ?? "-"}
              </Text>
            </Text>

            <View className="mt-7 flex-row justify-between items-center">
              <View>
                <Text className="text-white/40 text-[8px] uppercase mb-0.5">
                  Target End
                </Text>
                <Text className="text-white text-[11px]">
                  {hifzAnalytics.targetEndDate ?? "-"}
                </Text>
              </View>

              <View className="h-6 w-[1px] bg-white/5" />

              <View>
                <Text className="text-white/40 text-[8px] uppercase mb-0.5">
                  Rate
                </Text>
                <Text className="text-white text-[11px]">
                  {hifzAnalytics.todayTarget ?? 0} p/d
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* MURAJA */}
        {murajaPlan && (
          <View className="flex-1 pl-5">
            <View className="flex-row items-center mb-4">
              <Ionicons
                name="repeat-outline"
                size={15}
                color="rgba(255,255,255,0.7)"
              />
              <Text className="text-white/50 text-[9px] uppercase tracking-widest ml-2">
                Weekly Muraja
              </Text>
            </View>

            <Text className="text-white text-2xl tracking-tight leading-7">
              Juz {murajaPlan.start_juz ?? "-"} — {murajaPlan.end_juz ?? "-"}
            </Text>

            {dateRange ?
              <Text className="text-white/70 text-[10px] mt-1 italic">
                {dateRange}
              </Text>
            : null}

            <View className="mt-7 flex-row justify-between items-center">
              <View>
                <Text className="text-white/40 text-[8px] uppercase mb-0.5">
                  Daily Goal
                </Text>
                <Text className="text-white text-[11px]">
                  {murajaPlan.planned_pages_per_day ?? 0} pgs
                </Text>
              </View>

              <View className="h-6 w-[1px] bg-white/5" />

              <View>
                <Text className="text-white/40 text-[8px] uppercase mb-0.5">
                  Est. Time
                </Text>
                <Text className="text-white text-[11px]">
                  {murajaPlan.estimated_time_min ?? 0}m
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
