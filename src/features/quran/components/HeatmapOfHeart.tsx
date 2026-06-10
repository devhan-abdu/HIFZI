import React, { useState, useMemo, useCallback, memo } from "react";
import { View, Pressable, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useNavigate } from "@/src/hooks/useNavigate";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getSurahByPage } from "../../muraja/utils/quranMapping";
import { useCatalogStore } from "../../quran/store/catalogStore";
import {
  usePagePerformance,
  calculateRetrievability,
} from "../../user/hooks/usePagePerformance";

const TOTAL_PAGES = 604;

interface PageCellProps {
  page: number;
  hex: string;
  border: string;
  isSelected: boolean;
  onPress: (page: number) => void;
}

const PageCell = memo(({ page, hex, border, isSelected, onPress }: PageCellProps) => (
  <Pressable
    onPress={() => onPress(page)}
    hitSlop={3}
    style={{
      width: 7,
      height: 7,
      backgroundColor: isSelected ? border : hex,
      borderRadius: 1.5,
      borderWidth: 0.5,
      borderColor: border,
      transform: [{ scale: isSelected ? 1.8 : 1 }],
      zIndex: isSelected ? 10 : 1,
      shadowColor: isSelected ? border : "transparent",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isSelected ? 0.5 : 0,
      shadowRadius: 4,
      elevation: isSelected ? 4 : 0,
    }}
  />
));
PageCell.displayName = "PageCell";

export const HeatmapOfHeart = () => {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const surahs = useCatalogStore((s) => s.surahs);
  const { push } = useNavigate();
  const { data: performanceData } = usePagePerformance();

  const pages = useMemo(
    () => Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1),
    []
  );


  const getStrengthInfo = useCallback(
    (page: number) => {
      const surahName = getSurahByPage(page, surahs as any) ?? "—";
      const data = performanceData?.get(page);

      if (!data || !data.lastReviewedAt) {
        return {
          label: "Not Started",
          color: "#64748b",
          hex: "#f1f5f9",
          border: "#e2e8f0",
          percentage: 0,
          surahName,
        };
      }

      const retrievability = calculateRetrievability(
        data.stability ?? 1,
        data.lastReviewedAt
      );
      const percentage = Math.round(retrievability * 100);

      if (
        data.lastSessionQuality === "low" ||
        (data.lastMistakesCount ?? 0) >= 4 ||
        retrievability < 0.7
      ) {
        return {
          label: "Weak",
          color: "#ef4444",
          hex: "#fee2e2",
          border: "#ef4444",
          percentage,
          surahName,
        };
      }

      if (data.lastSessionQuality === "medium" || retrievability < 0.85) {
        return {
          label: "Partial",
          color: "#d97706",
          hex: "#fef3c7",
          border: "#f59e0b",
          percentage,
          surahName,
        };
      }

      if (data.consecutivePerfects >= 3) {
        return {
          label: "Mastered",
          color: "#0d9488",
          hex: "#18ccb1",
          border: "#0f766e",
          percentage: 100,
          surahName,
        };
      }

      return {
        label: "Strong",
        color: "#0f766e",
        hex: "rgba(24, 204, 177, 0.3)",
        border: "rgba(24, 204, 177, 0.6)",
        percentage,
        surahName,
      };
    },
    [performanceData, surahs]
  );

  const pageInfoMap = useMemo(() => {
    const map = new Map<number, ReturnType<typeof getStrengthInfo>>();
    for (let p = 1; p <= TOTAL_PAGES; p++) map.set(p, getStrengthInfo(p));
    return map;
  }, [getStrengthInfo]);

  const handlePageSelect = useCallback(
    (page: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedPage((prev) => (prev === page ? null : page));
    },
    []
  );

  const handleNavigate = useCallback(
    (page: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      push(`/(app)/quran/reader?page=${page.toString()}`);
    },
    [push]
  );

  const strengthInfo = selectedPage
    ? pageInfoMap.get(selectedPage) ?? null
    : null;

  return (
    <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-5 px-1">
        <View>
          <Text className="text-gray-400 uppercase tracking-[2px] text-[10px]">
            Heatmap of the Heart
          </Text>
        </View>
        {selectedPage && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPage(null);
            }}
            className="bg-slate-50 px-2 py-1 rounded-lg"
          >
            <Text className="text-primary text-[10px] uppercase tracking-wider">
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row flex-wrap gap-[3px] justify-center">
        {pages.map((page) => {
          const info = pageInfoMap.get(page)!;
          return (
            <PageCell
              key={page}
              page={page}
              hex={info.hex}
              border={info.border}
              isSelected={selectedPage === page}
              onPress={handlePageSelect}
            />
          );
        })}
      </View>

      {/* Bottom panel */}
      <View className="mt-8 pt-6 border-t border-slate-50">
        {selectedPage ? (
          <View className="flex-row items-center justify-between bg-slate-50/50 p-4 rounded-[24px] border border-slate-100">
            <View className="flex-1 mr-4">
              {/* Page number + strength badge */}
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-lg text-slate-900 leading-tight">
                  Page {selectedPage}
                </Text>
                <View
                  style={{
                    backgroundColor: strengthInfo?.color
                      ? `${strengthInfo.color}15`
                      : "transparent",
                  }}
                  className="px-2 py-0.5 rounded-full border border-slate-200"
                >
                  <Text
                    style={{ color: strengthInfo?.color }}
                    className="text-[9px] uppercase tracking-wider"
                  >
                    {strengthInfo?.label}
                  </Text>
                </View>
              </View>

              <Text className="text-slate-500 text-sm">
                {pageInfoMap.get(selectedPage)?.surahName ?? "—"}
              </Text>

              {strengthInfo?.label !== "Not Started" && (
                <View className="flex-row items-center mt-1.5 gap-1.5">
                  <View className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                    <View
                      style={{
                        width: `${strengthInfo?.percentage ?? 0}%`,
                        backgroundColor: strengthInfo?.color,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <Text className="text-[10px] text-slate-400">
                    {strengthInfo?.percentage}%
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => handleNavigate(selectedPage)}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Text className="text-primary text-xs">Open Mushaf</Text>
              <Ionicons name="arrow-forward" size={12} color="#276359" />
            </Pressable>
          </View>
        ) : (
          <View className="gap-y-3">
            {/* Hint */}
            <Text className="text-center text-[11px] text-slate-400">
              Press any page to see its surah and memory strength
            </Text>

            {/* Legend */}
            <View className="flex-row justify-between items-center opacity-60 px-2">
              <LegendItem color="#f1f5f9" border="#e2e8f0" label="Not Started" />
              <LegendItem color="#fee2e2" border="#ef4444" label="Weak" />
              <LegendItem color="#fef3c7" border="#f59e0b" label="Partial" />
              <LegendItem
                color="rgba(24, 204, 177, 0.3)"
                border="rgba(24, 204, 177, 0.6)"
                label="Strong"
              />
              <LegendItem color="#18ccb1" border="#0f766e" label="Mastered" />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const LegendItem = ({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) => (
  <View className="flex-row items-center">
    <View
      style={{
        backgroundColor: color,
        borderColor: border || color,
        borderWidth: border ? 1 : 0,
      }}
      className="w-2.5 h-2.5 rounded-sm mr-1.5 shadow-sm shadow-black/5"
    />
    <Text className="text-[9px] text-slate-400 uppercase tracking-tighter">
      {label}
    </Text>
  </View>
);