import { useMemo } from "react";
import { useWatch, Control } from "react-hook-form";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { HifzPlanSchemaFormType } from "../types";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Ionicons } from "@expo/vector-icons";
import { calculatePlanStats } from "../utils/plan-calculations";

const StatsSummary = ({
  control,
}: {
  control: Control<HifzPlanSchemaFormType>;
}) => {
  const surah = useLoadSurahData();
  const formData = useWatch<HifzPlanSchemaFormType>({ control });
  const safeFormData = {
    start_date: formData.start_date ?? new Date().toISOString().slice(0, 10),
    start_surah: formData.start_surah ?? 1,
    start_page: formData.start_page ?? 1,
    direction: formData.direction ?? "forward",
    selectedDays: formData.selectedDays ?? [0, 1, 2, 3],
    pages_per_day: formData.pages_per_day ?? 2,
    preferred_time: formData.preferred_time ?? "fajr",
    is_custom_time: formData.is_custom_time ?? false,
    is_reinforcement_enabled: formData.is_reinforcement_enabled ?? true,
    total_pages: formData.total_pages,
    evaluation_day: formData.evaluation_day ?? 5,
  };
  const stats = useMemo(
    () => calculatePlanStats(safeFormData),
    [
      formData.start_page,
      formData.pages_per_day,
      formData.selectedDays,
      formData.direction,
      formData.start_date,
      formData.start_surah,
      formData.total_pages,
    ],
  );

  const startSurahName = useMemo(() => {
    const s = surah.items.find(
      (item) => item.number === Number(formData.start_surah),
    );
    return s?.englishName;
  }, [formData.start_surah, surah]);

  return (
    <View className="bg-slate-50 p-6 rounded-[24px] mb-8 border border-slate-100">
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-slate-400 text-[10px] uppercase tracking-[1.5px] mb-1">
            Estimated Completion
          </Text>
          <Text className="text-primary text-2xl tracking-tight">
            {stats.finishDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
        <View className="bg-white px-3 py-1 rounded-full border border-slate-200">
          <Text className="text-slate-500 text-[9px] uppercase tracking-wider">
            {formData.direction === "backward" ? "Juz Amma First" : "Traditional"}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between py-4 border-y border-slate-100 mb-6">
        <View className="flex-1">
          <Text className="text-slate-400 text-[9px] uppercase mb-1">Start</Text>
          <Text className="text-slate-900 text-sm" numberOfLines={1}>
            {startSurahName}
          </Text>
        </View>

        <View className="w-8 h-8 items-center justify-center bg-white rounded-full border border-slate-100 mx-4">
          <Ionicons name="chevron-forward" size={14} color="#276359" />
        </View>

        <View className="flex-1 items-end">
          <Text className="text-slate-400 text-[9px] uppercase mb-1">Target</Text>
          <Text className="text-slate-900 text-sm" numberOfLines={1}>
            {stats.targetSurah}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between">
        <View>
          <Text className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">
            Volume
          </Text>
          <Text className="text-slate-700 text-lg">{stats.totalPages} Pages</Text>
        </View>

        <View className="items-end">
          <Text className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">
            Duration
          </Text>
          <Text className="text-slate-700 text-lg">
            {stats.daysNeeded >= 30 ?
              `~${Math.round(stats.daysNeeded / 30)} Months`
            : `${stats.daysNeeded} Days`}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default StatsSummary;
