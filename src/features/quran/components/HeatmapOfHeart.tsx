import React, { useState } from "react";
import { View, Pressable, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { getSurahByPage } from "../../muraja/utils/quranMapping";
import { useCatalogStore } from "../../quran/store/catalogStore";
import { usePagePerformance, calculateRetrievability } from "../../user/hooks/usePagePerformance";

const TOTAL_PAGES = 604;
const { width: screenWidth } = Dimensions.get('window');

export const HeatmapOfHeart = () => {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const surahs = useCatalogStore(s => s.surahs);

  const { data: performanceData } = usePagePerformance();

  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  const getStrengthInfo = (page: number) => {
    const data = performanceData?.get(page);
    if (!data || !data.lastReviewedAt) {
      return { label: "Not Started", color: "#64748b", hex: "#f1f5f9", border: "#e2e8f0", percentage: 0 };
    }
    
    const retrievability = calculateRetrievability(data.stability ?? 1, data.lastReviewedAt);
    const percentage = Math.round(retrievability * 100);

    if (data.consecutivePerfects >= 3) {
      return { label: "Mastered", color: "#0d9488", hex: "#18ccb1", border: "#0f766e", percentage: 100 };
    }

    if (data.lastSessionQuality === 'low' || (data.lastMistakesCount ?? 0) >= 4 || retrievability < 0.7) {
      return { label: "Weak", color: "#ef4444", hex: "#fee2e2", border: "#ef4444", percentage };
    }

    const now = new Date();
    const lastReview = new Date(data.lastReviewedAt);
    const daysSince = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

    if (data.lastSessionQuality === 'medium' || daysSince > 14 || retrievability < 0.85) {
      return { label: "Partial", color: "#d97706", hex: "#fef3c7", border: "#f59e0b", percentage };
    }

    return { label: "Strong", color: "#0f766e", hex: "rgba(24, 204, 177, 0.3)", border: "rgba(24, 204, 177, 0.6)", percentage };
  };

  const handlePageSelect = (page: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPage(selectedPage === page ? null : page);
  };

  const handleNavigate = (page: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
     router.push(`/(app)/quran/reader?page=${page.toString()}`);
  };

 

  const strengthInfo = selectedPage ? getStrengthInfo(selectedPage) : null;
  const surahName = selectedPage ? getSurahByPage(selectedPage, surahs as any) : null;

  return (
    <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
      <View className="flex-row justify-between items-center mb-5 px-1">
        <View>
          <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] ">
            Heatmap of the Heart
          </Text>
          <Text className="text-[9px] text-slate-300 ">Tap to explore • Long-press to open</Text>
        </View>
        {selectedPage && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPage(null);
            }}
            className="bg-slate-50 px-2 py-1 rounded-lg"
          >
            <Text className="text-primary text-[10px]  uppercase tracking-wider">Clear</Text>
          </Pressable>
        )}
      </View>
      
      <View className="flex-row flex-wrap gap-[3px] justify-center">
        {pages.map((page) => {
          const info = getStrengthInfo(page);
          const isSelected = selectedPage === page;
          
          return (
            <Pressable
              key={page}
              onPress={() => handlePageSelect(page)}
              onLongPress={() => handleNavigate(page)}
              delayLongPress={300}
              style={{
                width: 7,
                height: 7,
                backgroundColor: isSelected ? info.border : info.hex,
                borderRadius: 1.5,
                borderWidth: 0.5,
                borderColor: info.border,
                transform: [{ scale: isSelected ? 1.8 : 1 }],
                zIndex: isSelected ? 10 : 1,
                shadowColor: isSelected ? info.border : "transparent",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.5 : 0,
                shadowRadius: 4,
                elevation: isSelected ? 4 : 0,
              }}
            />
          );
        })}
      </View>
      

      <View className="mt-8 pt-6 border-t border-slate-50">
        {selectedPage ? (
          <View className="flex-row items-center justify-between bg-slate-50/50 p-4 rounded-[24px] border border-slate-100">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-lg  text-slate-900 leading-tight">Page {selectedPage}</Text>
                <View
                  style={{ backgroundColor: strengthInfo?.color ? `${strengthInfo.color}15` : 'transparent' }}
                  className="px-2 py-0.5 rounded-full border border-slate-200"
                >
                  <Text style={{ color: strengthInfo?.color }} className="text-[9px]  uppercase tracking-wider">
                    {strengthInfo?.label}
                  </Text>
                </View>
              </View>
              <Text className="text-slate-500 text-sm ">{surahName || "Surah Unknown"}</Text>
              {strengthInfo?.label !== "New" && (
                <View className="flex-row items-center mt-1.5 gap-1.5">
                  <View className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                    <View
                      style={{
                        width: (strengthInfo?.percentage ?? 0) + "%" as any,
                        backgroundColor: strengthInfo?.color
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <Text className="text-[10px]  text-slate-400">{strengthInfo?.percentage}%</Text>
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
          <View className="flex-row justify-between items-center opacity-60 px-2">
            <LegendItem color="#f1f5f9" border="#e2e8f0" label="Not Started" />
            <LegendItem color="#fee2e2" border="#ef4444" label="Weak" />
            <LegendItem color="#fef3c7" border="#f59e0b" label="Partial" />
            <LegendItem color="rgba(24, 204, 177, 0.3)" border="rgba(24, 204, 177, 0.6)" label="Strong" />
            <LegendItem color="#18ccb1" border="#0f766e" label="Mastered" />
          </View>
        )}
      </View>
    </View>
 
  );
};

const LegendItem = ({ color, label, border }: { color: string, label: string, border?: string }) => (
  <View className="flex-row items-center">
    <View 
      style={{ backgroundColor: color, borderColor: border || color, borderWidth: border ? 1 : 0 }} 
      className="w-2.5 h-2.5 rounded-sm mr-1.5 shadow-sm shadow-black/5" 
    />
    <Text className="text-[9px] text-slate-400  uppercase tracking-tighter">{label}</Text>
  </View>
);

