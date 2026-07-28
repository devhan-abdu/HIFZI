import React, { useState, useMemo, useCallback, memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useNavigate } from "@/src/hooks/useNavigate";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const pages = useMemo(
    () => Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1),
    []
  );


  const getStrengthInfo = useCallback(
    (page: number) => {
      const surahName = getSurahByPage(page, surahs as any) ?? "—";
      const data = performanceData?.get(page);

      // Brand teal scale — readable in light + dark (no amber/red fills)
      const palette = isDark
        ? {
            notStarted: { color: "#9ba3a0", hex: "#272e2a", border: "#2a312d" },
            weak: { color: "#8fa39c", hex: "#2c3833", border: "#3d4f47" },
            partial: { color: "#6bb5a8", hex: "#334940", border: "#3f6b5f" },
            strong: { color: "#4ecdb8", hex: "rgba(34, 87, 78, 0.55)", border: "rgba(78, 205, 184, 0.45)" },
            mastered: { color: "#18ccb1", hex: "#18ccb1", border: "#0f766e" },
          }
        : {
            notStarted: { color: "#64748b", hex: "#f1f5f9", border: "#e2e8f0" },
            weak: { color: "#5a7169", hex: "#e8eeeb", border: "#c5d4ce" },
            partial: { color: "#3d7a6e", hex: "#d7ebe5", border: "#9bc4b8" },
            strong: { color: "#0f766e", hex: "rgba(24, 204, 177, 0.28)", border: "rgba(24, 204, 177, 0.55)" },
            mastered: { color: "#0d9488", hex: "#18ccb1", border: "#0f766e" },
          };

      if (!data || !data.lastReviewedAt) {
        return {
          label: "Not Started",
          ...palette.notStarted,
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
          ...palette.weak,
          percentage,
          surahName,
        };
      }

      if (data.lastSessionQuality === "medium" || retrievability < 0.85) {
        return {
          label: "Partial",
          ...palette.partial,
          percentage,
          surahName,
        };
      }

      if (data.consecutivePerfects >= 3) {
        return {
          label: "Mastered",
          ...palette.mastered,
          percentage: 100,
          surahName,
        };
      }

      return {
        label: "Strong",
        ...palette.strong,
        percentage,
        surahName,
      };
    },
    [performanceData, surahs, isDark]
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
    <View className="bg-surface dark:bg-surface-muted rounded-[32px] p-6 border border-border dark:border-white/10 shadow-sm">
      <View className="flex-row justify-between items-center mb-5 px-1">
        <View>
          <Text className="text-muted uppercase tracking-[2px] text-[10px]">
            Heatmap of the Heart
          </Text>
        </View>
        {selectedPage && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPage(null);
            }}
            className="bg-primary/10 px-2 py-1 rounded-lg"
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

      <View className="mt-8 pt-6 border-t border-border">
        {selectedPage ? (
          <View className="flex-row items-center justify-between bg-primary/5 dark:bg-background/30 p-4 rounded-[24px] border border-border dark:border-white/10">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-lg text-text leading-tight">
                  Page {selectedPage}
                </Text>
                <View
                  style={{
                    backgroundColor: strengthInfo?.color
                      ? `${strengthInfo.color}15`
                      : "transparent",
                  }}
                  className="px-2 py-0.5 rounded-full border border-border dark:border-white/10"
                >
                  <Text
                    style={{ color: strengthInfo?.color }}
                    className="text-[9px] uppercase tracking-wider"
                  >
                    {strengthInfo?.label}
                  </Text>
                </View>
              </View>

              <Text className="text-muted text-sm">
                {pageInfoMap.get(selectedPage)?.surahName ?? "—"}
              </Text>

              {strengthInfo?.label !== "Not Started" && (
                <View className="flex-row items-center mt-1.5 gap-1.5">
                  <View className="h-1 flex-1 bg-border rounded-full overflow-hidden">
                    <View
                      style={{
                        width: `${strengthInfo?.percentage ?? 0}%`,
                        backgroundColor: strengthInfo?.color,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <Text className="text-[10px] text-muted">
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
            <Text className="text-center text-[11px] text-muted">
              Press any page to see its surah and memory strength
            </Text>

            {/* Legend */}
            <View className="flex-row justify-between items-center opacity-80 px-2">
              <LegendItem
                color={isDark ? "#272e2a" : "#f1f5f9"}
                border={isDark ? "#2a312d" : "#e2e8f0"}
                label="Not Started"
              />
              <LegendItem
                color={isDark ? "#2c3833" : "#e8eeeb"}
                border={isDark ? "#3d4f47" : "#c5d4ce"}
                label="Weak"
              />
              <LegendItem
                color={isDark ? "#334940" : "#d7ebe5"}
                border={isDark ? "#3f6b5f" : "#9bc4b8"}
                label="Partial"
              />
              <LegendItem
                color={isDark ? "rgba(34, 87, 78, 0.55)" : "rgba(24, 204, 177, 0.28)"}
                border={isDark ? "rgba(78, 205, 184, 0.45)" : "rgba(24, 204, 177, 0.55)"}
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
    <Text className="text-[9px] text-muted uppercase tracking-tighter">
      {label}
    </Text>
  </View>
);
