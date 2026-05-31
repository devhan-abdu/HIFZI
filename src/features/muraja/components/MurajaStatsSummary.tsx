import { useMemo } from "react";
import { useWatch, Control } from "react-hook-form";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { WeeklyMurajaFormType } from "../types";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Ionicons } from "@expo/vector-icons";
import { calculateMurajaPlanStats } from "../utils/plan-calculations";
import { getSurahNameByNumber } from "../utils/quranMapping";

const MurajaStatsSummary = ({
  control,
}: {
  control: Control<WeeklyMurajaFormType>;
}) => {
  const surah = useLoadSurahData();
  const formData = useWatch<WeeklyMurajaFormType>({ control });
  const safeFormData = {
    week_start_date: formData.week_start_date ?? new Date().toISOString().slice(0, 10),
    start_surah: formData.start_surah ?? 1,
    start_page: formData.start_page ?? 1,
    end_surah: formData.end_surah ?? 114,
    end_page: formData.end_page ?? 604,
    selectedDays: formData.selectedDays ?? [0, 1, 2, 3],
    planned_pages_per_day: formData.planned_pages_per_day ?? 20,
    preferred_time: formData.preferred_time ?? "fajr",
    is_custom_time: formData.is_custom_time ?? false,
    evaluation_day: formData.evaluation_day ?? 5,
  };

  const stats = useMemo(
    () => calculateMurajaPlanStats(safeFormData, surah.items),
    [
      formData.start_page,
      formData.end_page,
      formData.planned_pages_per_day,
      formData.selectedDays,
      formData.week_start_date,
      surah.items,
    ],
  );

  const startSurahName = useMemo(() => {
    return getSurahNameByNumber(Number(formData.start_surah ?? 1), surah.items) || "Al-Fatihah";
  }, [formData.start_surah, surah.items]);

  const endSurahName = useMemo(() => {
    return getSurahNameByNumber(Number(formData.end_surah ?? 114), surah.items) || "An-Nas";
  }, [formData.end_surah, surah.items]);

  return (
    <View className="px-1 py-2">
      <View className="flex-row justify-between items-center py-3 border-b border-slate-100">
        <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
          Est. Completion
        </Text>
        <Text className="text-slate-700 ">
          {stats.finishDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>

      <View className="flex-row justify-between items-center py-3 border-b border-slate-100">
        <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
          Range
        </Text>
        <View className="flex-row items-center">
          <Text className="text-slate-700 ">{startSurahName}</Text>
          <Ionicons name="arrow-forward" size={10} color="#94a3b8" className="mx-2" />
          <Text className="text-slate-700 ">{endSurahName}</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center py-3 border-b border-slate-100">
        <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
          Volume
        </Text>
        <Text className="text-slate-700 ">{stats.totalPages} Pages</Text>
      </View>

      <View className="flex-row justify-between items-center py-3">
        <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
          Total Duration
        </Text>
        <Text className="text-slate-700 ">
          {stats.daysNeeded >= 30 ?
            `~${Math.round(stats.daysNeeded / 30)} Months`
          : `${stats.daysNeeded} Days`}
        </Text>
      </View>
    </View>
  );
};

export default MurajaStatsSummary;
