import React, { useEffect } from "react";
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

export function ProblemSlide() {
  const insets = useSafeAreaInsets();
  const headingOpacity = useSharedValue(1);
  const headingY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const listOpacity = useSharedValue(1);

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

  const listStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
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
          Adaptive Plan & SRS
        </Text>
        <Text className="text-white text-3xl  tracking-tight leading-tight">
          A Plan That Keeps{"\n"}Up With You
        </Text>
      </Animated.View>

      {/* Mock Daily Task Card matching the real app style */}
      <Animated.View style={cardStyle} className="my-6">
        <View className="bg-white rounded-[32px] p-6 shadow-lg border border-slate-100">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center mb-3 gap-2">
                <View className="bg-primary/10 px-2.5 py-1 rounded-full">
                  <Text className="text-primary text-[9px] uppercase tracking-widest ">
                    Hifz Task
                  </Text>
                </View>
                <View className="bg-amber-50 px-2.5 py-1 rounded-full flex-row items-center">
                  <Ionicons name="flame" size={10} color="#d97706" />
                  <Text className="text-amber-600 text-[9px] uppercase tracking-widest  ml-1">
                    SRS Due
                  </Text>
                </View>
              </View>

              <Text className="text-2xl  tracking-tight mb-1 text-slate-900">
                Surat Al-Baqarah
              </Text>
              <Text className="text-xs text-slate-500 ">
                Pages 2 – 3 • Target: 2 pages • Juz 1
              </Text>
            </View>

            <View className="w-10 h-10 rounded-2xl items-center justify-center bg-slate-50 border border-slate-100">
              <Ionicons name="ellipsis-horizontal" size={18} color="#94a3b8" />
            </View>
          </View>

          <View className="mt-6 flex-row items-center justify-between pt-4 border-t border-slate-100">
            <View className="flex-row items-center">
              <Text className="text-primary uppercase tracking-widest text-[10px] ">
                Open Mushaf
              </Text>
              <Ionicons
                name="chevron-forward"
                size={12}
                color="#276359"
                style={{ marginLeft: 4 }}
              />
            </View>

            <View className="h-10 px-4 rounded-xl flex-row items-center bg-primary/5 border border-primary/10">
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#276359"
              />
              <Text className="text-primary uppercase tracking-widest text-[9px]  ml-2">
                Mark Done
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Feature Bullet Points */}
      <Animated.View style={listStyle} className="gap-y-4 mb-2">
        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">
              Personalized Daily Tracking
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Set goals, log with quality scores, get smart reminders, and earn
              badges & XP.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">
              Weekly Adaptive Evaluations
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Dynamic exams adjust automatically to evaluate progress and update
              your schedule.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mt-0.5">
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">
              Spaced Repetition System (SRS)
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Recommends fading pages daily to keep your Hifz warm alongside
              your Muraja cycle.
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
