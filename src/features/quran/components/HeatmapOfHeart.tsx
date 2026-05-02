import React, { useState } from "react";
import { View, Pressable, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/src/lib/db/local-client";
import { pagePerformance } from "@/src/features/user/database/userSchema";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { getSurahByPage } from "../../muraja/utils/quranMapping";
import { useCatalogStore } from "../../quran/store/catalogStore";

const TOTAL_PAGES = 604;
const { width: screenWidth } = Dimensions.get('window');

export const HeatmapOfHeart = () => {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const surahs = useCatalogStore(s => s.surahs);

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["page-performance-all"],
    queryFn: async () => {
      const rows = await db.select({
        pageNumber: pagePerformance.pageNumber,
        stability: pagePerformance.stability,
        lastReviewedAt: pagePerformance.lastReviewedAt,
        consecutivePerfects: pagePerformance.consecutivePerfects,
        lastSessionQuality: pagePerformance.lastSessionQuality,
        lastMistakesCount: pagePerformance.lastMistakesCount,
      }).from(pagePerformance);
      
      const map = new Map<number, any>();
      rows.forEach((r) => map.set(r.pageNumber, r));
      return map;
    },
  });

  // if (isLoading) return (
  //   <View className="h-40 items-center justify-center bg-white rounded-[32px] border border-slate-100">
  //     <Text className="text-slate-400 font-medium">Loading Heatmap...</Text>
  //   </View>
  // );

  const calculateRetrievability = (stability: number, lastReviewedAt: string | null) => {
    if (!lastReviewedAt || stability === 0) return 0;
    const now = new Date();
    const lastReview = new Date(lastReviewedAt);
    const daysSince = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
    
    // R = e^(ln(0.9) * t / S)
    return Math.pow(Math.E, Math.log(0.9) * daysSince / stability);
  };

  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  const getStrengthInfo = (page: number) => {
    const data = performanceData?.get(page);
    if (!data || !data.lastReviewedAt) {
      return { label: "Not Started", color: "#64748b", hex: "#f1f5f9", border: "#e2e8f0", percentage: 0 };
    }
    
    const retrievability = calculateRetrievability(data.stability ?? 1, data.lastReviewedAt);
    const percentage = Math.round(retrievability * 100);

    if (data.consecutivePerfects >= 3) {
      return { label: "Mastered", color: "#ca8a04", hex: "#fef9c3", border: "#eab308", percentage: 100 };
    }

    if (data.lastSessionQuality === 'low' || (data.lastMistakesCount ?? 0) >= 4 || retrievability < 0.7) {
      return { label: "Weak", color: "#ef4444", hex: "#fee2e2", border: "#ef4444", percentage };
    }

    const now = new Date();
    const lastReview = new Date(data.lastReviewedAt);
    const daysSince = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

    if (data.lastSessionQuality === 'medium' || daysSince > 14 || retrievability < 0.85) {
      return { label: "Partial", color: "#eab308", hex: "#fef08a", border: "#eab308", percentage };
    }

    return { label: "Strong", color: "#276359", hex: "#e9f0ef", border: "#276359", percentage };
  };

  const handlePageSelect = (page: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPage(selectedPage === page ? null : page);
  };

  const handleNavigate = (page: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: "/(app)/mushaf",
      params: { page: page.toString() }
    });
  };

  const strengthInfo = selectedPage ? getStrengthInfo(selectedPage) : null;
  const surahName = selectedPage ? getSurahByPage(selectedPage, surahs as any) : null;

  return (
    <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
      <View className="flex-row justify-between items-center mb-5 px-1">
        <View>
          <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] font-bold">
            Heatmap of the Heart
          </Text>
          <Text className="text-[9px] text-slate-300 font-medium">Tap to explore • Long-press to open</Text>
        </View>
        {selectedPage && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPage(null);
            }}
            className="bg-slate-50 px-2 py-1 rounded-lg"
          >
            <Text className="text-primary text-[10px] font-bold uppercase tracking-wider">Clear</Text>
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
                backgroundColor: isSelected ? "#0f172a" : info.hex,
                borderRadius: 1.5,
                borderWidth: isSelected ? 0 : (info.label !== "New" ? 0.5 : 0),
                borderColor: info.border,
                transform: [{ scale: isSelected ? 1.8 : 1 }],
                zIndex: isSelected ? 10 : 1,
                shadowColor: isSelected ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.3 : 0,
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
                <Text className="text-lg font-black text-slate-900 leading-tight">Page {selectedPage}</Text>
                <View
                  style={{ backgroundColor: strengthInfo?.color ? `${strengthInfo.color}15` : 'transparent' }}
                  className="px-2 py-0.5 rounded-full border border-slate-200"
                >
                  <Text style={{ color: strengthInfo?.color }} className="text-[9px] font-black uppercase tracking-wider">
                    {strengthInfo?.label}
                  </Text>
                </View>
              </View>
              <Text className="text-slate-500 text-sm font-medium">{surahName || "Surah Unknown"}</Text>
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
                  <Text className="text-[10px] font-bold text-slate-400">{strengthInfo?.percentage}%</Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => handleNavigate(selectedPage)}
              className="bg-primary px-5 py-3.5 rounded-2xl flex-row items-center shadow-lg shadow-primary/20 active:scale-[0.9] transition-all"
            >
              <Text className="text-white font-bold mr-2 text-xs">Open</Text>
              <Ionicons name="book-outline" size={14} color="white" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row justify-between items-center opacity-60 px-2">
            <LegendItem color="#f1f5f9" label="Not Started" />
            <LegendItem color="#fee2e2" label="Weak" />
            <LegendItem color="#fef08a" label="Partial" />
            <LegendItem color="#e9f0ef" label="Strong" />
            <LegendItem color="#fef9c3" label="Mastered" border="#eab308" />
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
    <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{label}</Text>
  </View>
);

