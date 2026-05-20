import React, { useEffect, useMemo, memo } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const TOTAL_PAGES = 604;

// Color schemes matching the real app exactly
const PAGE_INFOS = [
  { label: "Not Started", color: "#64748b", hex: "#f1f5f9", border: "#e2e8f0" },
  { label: "Weak", color: "#ef4444", hex: "#fee2e2", border: "#ef4444" },
  { label: "Partial", color: "#d97706", hex: "#fef3c7", border: "#f59e0b" },
  {
    label: "Strong",
    color: "#0f766e",
    hex: "rgba(24, 204, 177, 0.3)",
    border: "rgba(24, 204, 177, 0.6)",
  },
  { label: "Mastered", color: "#0d9488", hex: "#18ccb1", border: "#0f766e" },
];

// Pre-distribute colors to make the visual representation look highly authentic
// Mostly completed at the end (Juz 30), some in the beginning (Juz 1), mostly unstarted in middle
const CELL_STATES = Array.from({ length: TOTAL_PAGES }, (_, i) => {
  const page = i + 1;
  // Juz 30 (pages 582 - 604) are mostly Mastered or Strong
  if (page >= 582) {
    const r = Math.random();
    if (r < 0.6) return PAGE_INFOS[4]; // Mastered
    if (r < 0.9) return PAGE_INFOS[3]; // Strong
    return PAGE_INFOS[2]; // Partial
  }
  // Juz 1 (pages 2 - 21) are mostly Strong or Mastered, with a few Partial/Weak
  if (page <= 21 && page > 1) {
    const r = Math.random();
    if (r < 0.5) return PAGE_INFOS[3]; // Strong
    if (r < 0.7) return PAGE_INFOS[4]; // Mastered
    if (r < 0.9) return PAGE_INFOS[2]; // Partial
    return PAGE_INFOS[1]; // Weak
  }
  // Juz 2 (pages 22 - 41)
  if (page > 21 && page <= 41) {
    const r = Math.random();
    if (r < 0.4) return PAGE_INFOS[2]; // Partial
    if (r < 0.7) return PAGE_INFOS[1]; // Weak
    if (r < 0.9) return PAGE_INFOS[3]; // Strong
    return PAGE_INFOS[0]; // Not started
  }
  // Rest are mostly unstarted
  const r = Math.random();
  if (r < 0.94) return PAGE_INFOS[0]; // Not Started
  if (r < 0.97) return PAGE_INFOS[1]; // Weak
  return PAGE_INFOS[2]; // Partial
});

const MiniPageCell = memo(
  ({ hex, border }: { hex: string; border: string }) => (
    <View
      style={{
        width: 6,
        height: 6,
        backgroundColor: hex,
        borderRadius: 1.2,
        borderWidth: 0.4,
        borderColor: border,
      }}
    />
  ),
);
MiniPageCell.displayName = "MiniPageCell";

export function HeatmapSlide() {
  const insets = useSafeAreaInsets();
  const headingOpacity = useSharedValue(1);
  const headingY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const infoOpacity = useSharedValue(1);

  useEffect(() => {
    // Entrance animations removed for smooth flatlist swiping
  }, []);

  const headingStyle = useAnimatedStyle(() => ({
    opacity: headingOpacity.value,
    transform: [{ translateY: headingY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const infoStyle = useAnimatedStyle(() => ({
    opacity: infoOpacity.value,
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 96,
        },
      ]}
      className="bg-primary flex-1 justify-between px-8"
    >
      {/* Heading */}
      <Animated.View style={headingStyle} className="mt-4">
        <Text className="text-white/60 uppercase tracking-[2px] text-[11px] mb-2 ">
          Visual Progress
        </Text>
        <Text className="text-white text-3xl  tracking-tight leading-tight">
          Heatmap of the Heart
        </Text>
      </Animated.View>

      {/* Heatmap Card matching the real app layout style */}
      <Animated.View style={cardStyle} className="my-6">
        <View className="bg-white rounded-[32px] p-5 shadow-lg border border-slate-100">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-400 uppercase tracking-[1.5px] text-[9px] ">
              Heatmap of the Heart (604 Pages)
            </Text>
            <View className="bg-emerald-50 px-2 py-0.5 rounded-full flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
              <Text className="text-emerald-700 text-[8px] uppercase tracking-widest ">
                Live Grid
              </Text>
            </View>
          </View>

          {/* Grid representation */}
          <View className="flex-row flex-wrap gap-[2.5px] justify-center items-center py-1">
            {CELL_STATES.map((state, i) => (
              <MiniPageCell key={i} hex={state.hex} border={state.border} />
            ))}
          </View>

          {/* Real app legend items */}
          <View className="mt-5 pt-4 border-t border-slate-50 flex-row justify-between items-center">
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
      </Animated.View>

      {/* Info Bullet Points */}
      <Animated.View style={infoStyle} className="gap-y-4 mb-2">
        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
            <Ionicons name="heart" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">Visualise Your Memory</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Instantly view memory strength for every single page in the Quran
              at a glance.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
            <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">Prevent Memory Decay</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Pages change from strong (green) to weak (red) over time, alerting
              you to revise before they fade.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
            <Ionicons name="analytics" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">Real-Time Sync</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Your actual Hifz and Muraja logs dynamically populate this visual
              heatmap as you track.
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

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
        borderWidth: border ? 0.5 : 0,
      }}
      className="w-2 h-2 rounded-[1.5px] mr-1"
    />
    <Text className="text-[7.5px] text-slate-400  uppercase tracking-tighter">
      {label}
    </Text>
  </View>
);
