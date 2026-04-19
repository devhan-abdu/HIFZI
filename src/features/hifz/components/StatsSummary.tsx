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
    ],
  );

  const startSurahName = useMemo(() => {
    console.log(formData, "formdata");
    const s = surah.items.find(
      (item) => item.number === Number(formData.start_surah),
    );
    return s?.englishName;
  }, [formData.start_surah, surah]);

  return (
    <View className="bg-primary p-6 rounded-[32px] mb-8 shadow-2xl shadow-primary/30">
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-white/70 text-[10px] uppercase  tracking-[2px] mb-1">
            Estimated Completion
          </Text>
          <Text className="text-white text-3xl  tracking-tight">
            {stats.finishDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
        <View className="bg-white/20 px-3 py-1.5 rounded-xl border border-white/20">
          <Text className="text-white text-[10px]  uppercase tracking-wider">
            {formData.direction === "backward" ? "Backward" : "Forward"}
          </Text>
        </View>
      </View>

      <View className="bg-white/10 rounded-2xl p-4 mb-6 flex-row items-center justify-between border border-white/10">
        <View className="flex-1">
          <Text className="text-white/50 text-[9px]  uppercase mb-1">From</Text>
          <Text className="text-white   text-sm" numberOfLines={1}>
            {startSurahName}
          </Text>
        </View>

        <View className="px-3 bg-white/20 py-1 rounded-full mx-2">
          <Ionicons name="arrow-forward" size={14} color="white" />
        </View>

        <View className="flex-1 items-end">
          <Text className="text-white/50 text-[9px]  uppercase mb-1">To</Text>
          <Text className="text-white   text-sm" numberOfLines={1}>
            {stats.targetSurah}
          </Text>
        </View>
      </View>

      <View className="flex-row border-t border-white/10 pt-5 justify-between">
        <View>
          <Text className="text-white/60 text-[10px]  uppercase tracking-widest mb-1">
            Total Pages
          </Text>
          <Text className="text-white text-xl ">{stats.totalPages} Pages</Text>
        </View>

        <View className="items-end">
          <Text className="text-white/60 text-[10px]  uppercase tracking-widest mb-1">
            Journey Length
          </Text>
          <Text className="text-white text-xl ">
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
