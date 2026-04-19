import HifzOverViewCard from "@/src/features/hifz/components/HifzOverviewCard";
import { useGetHifzPlan } from "@/src/features/hifz/hook/useGetHifzPlan";
import { getPerformance } from "@/src/features/hifz/utils/plan-calculations";
import { hifzStatus } from "@/src/features/hifz/utils/plan-status";
import { useMemo } from "react";
import { View } from "react-native";
import { SectionSkeleton } from "./Skeleton";
import { ISurah } from "@/src/types";
import { SectionHeader } from "../SectionHeader";
import { Text } from "@/src/components/common/ui/Text";

export function HifzSection({ surahData }: { surahData: ISurah[] }) {
  const { hifz, isLoading, error } = useGetHifzPlan();

  const hifzAnalytics = useMemo(
    () => hifzStatus(hifz ?? null, surahData),
    [hifz, surahData],
  );

  if (isLoading) return <SectionSkeleton />;
  if (error || !hifz || !hifzAnalytics) return <Text>No Hifz plan found</Text>;

  const config = getPerformance(
    hifzAnalytics.plannedPages - hifzAnalytics.actualPagesDone,
  );

  return (
    <>
      <SectionHeader title="Hifz Progress" />
      <View className="bg-white rounded-[32px] p-6 shadow-md shadow-slate-200 border border-slate-100">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-slate-400  uppercase tracking-[2px] text-[9px] mb-1.5">
              Current Goal
            </Text>
            <Text className="text-slate-900 text-3xl  mb-3 tracking-tighter">
              Daily Hifz
            </Text>

            <View
              className={`flex-row items-center px-3 py-1 rounded-full mr-auto ${config.bg}`}
            >
              <View className={`w-1.5 h-1.5 rounded-full mr-2 ${config.dot}`} />
              <Text
                className={` text-[10px] uppercase tracking-wider ${config.color}`}
              >
                {config.value === 0 ?
                  config.label
                : `${Math.abs(config.value)} Pages ${config.label}`}
              </Text>
            </View>
          </View>

          <HifzOverViewCard
            progress={hifzAnalytics.accuracy}
            pages={`${hifzAnalytics.startPage} - ${hifzAnalytics.endPage}`}
            surahName={hifzAnalytics.endSurah}
            strokeWidth={10}
            variant="white"
          />
        </View>

        <View className="flex-row items-center border-t border-gray-100 pt-5">
          <View className="pr-6 mr-6 border-r border-slate-100">
            <Text className="text-slate-900 text-3xl  tracking-tighter">
              {hifzAnalytics.todayTarget}
            </Text>
            <Text className="text-slate-400 text-[9px]  uppercase tracking-widest">
              Daily Pages
            </Text>
          </View>

          <View>
            <Text className="text-slate-900 text-lg  tracking-tight">
              {hifzAnalytics.targetEndDate}
            </Text>
            <Text className="text-slate-400 text-[9px]  uppercase tracking-widest">
              Target End Date
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}
