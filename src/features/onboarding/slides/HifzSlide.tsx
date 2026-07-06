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

const SAMPLE_AYAH =
  "إِنَّا نَحْنُ نَزَّلْنَا ٱلذِّكْرَ وَإِنَّا لَهُۥ لَحَٰفِظُونَ";

export function HifzSlide() {
  const insets = useSafeAreaInsets();
  const headingOpacity = useSharedValue(1);
  const headingY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const listOpacity = useSharedValue(1);

  useEffect(() => {
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
      <Animated.View style={headingStyle} className="mt-4">
        <Text className="text-white/60 uppercase tracking-[2px] text-[11px] mb-2 ">
          Quran Reader & Companion
        </Text>
        <Text className="text-white text-3xl  tracking-tight leading-tight">
          Read, Understand{"\n"}& Connect
        </Text>
      </Animated.View>

      <Animated.View style={cardStyle} className="my-6">
        <View className="bg-surface rounded-[32px] p-6 shadow-lg border border-border">
          <View className="flex-row justify-between items-center pb-4 border-b border-border mb-4">
            <View className="flex-row items-center gap-x-2">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Text className="text-text  text-xs">Al-Hijr • Ayah 9</Text>
            </View>
            <View className="flex-row gap-x-3">
              <Ionicons name="book-outline" size={16} color="#64748b" />
              <Ionicons
                name="volume-medium-outline"
                size={17}
                color="#64748b"
              />
            </View>
          </View>

          <View className="items-center py-2">
            <Text
              style={{
                fontFamily: "Uthman",
                fontSize: 24,
                lineHeight: 42,
                color: "#0f172a",
                textAlign: "center",
                writingDirection: "rtl",
              }}
            >
              {SAMPLE_AYAH}
            </Text>
            <Text className="text-muted text-xs text-center mt-3 leading-5 px-2">
              "Indeed, it is We who sent down the Quran and indeed, We will be
              its guardian."
            </Text>
          </View>

          <View className="mt-5 bg-surface rounded-2xl p-3 flex-row items-center justify-between border border-border shadow-sm">
            <View className="flex-row items-center gap-x-2 flex-1 mr-2">
              <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
                <Ionicons
                  name="chatbubble-ellipses"
                  size={14}
                  color="#FFFFFF"
                />
              </View>
              <Text
                className="text-[11px] text-text flex-1"
                numberOfLines={1}
              >
                Quran AI: Ask context, Tafsir, or lessons...
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="#64748b" />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={listStyle} className="gap-y-4 mb-2">
        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="book" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">
              Premium Interactive Mushaf
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Read Quran with clear Uthmanic script, word-by-word highlight, and
              smooth audio.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="language" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">
              Contextual Translations
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Access high-quality translations and detailed Tafsir to enrich
              your relationship.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">
              Quran-Aware AI Companion
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Deepen your learning. Ask your AI companion about background
              context and explanations.
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
